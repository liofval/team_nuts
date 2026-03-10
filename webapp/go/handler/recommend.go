package handler

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"press-release-editor/db"
	"press-release-editor/httputil"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

// splitSearchTerms はクエリ文字列を空白（全角スペース含む）で分割して単語リストを返す
func splitSearchTerms(q string) []string {
	fields := strings.FieldsFunc(q, func(r rune) bool {
		return r == ' ' || r == '\t' || r == '\n' || r == '\u3000'
	})
	seen := map[string]bool{}
	var result []string
	for _, f := range fields {
		if f != "" && !seen[f] {
			seen[f] = true
			result = append(result, f)
		}
	}
	return result
}

// buildKeywordQuery はキーワード検索用の動的SQLを構築する。
// スコアリング: タグ名一致=3点 > タイトル一致=2点 > 本文一致=1点（各単語ごとに加算）
// tagIDs が非空の場合はANDフィルタとして適用する。
func buildKeywordQuery(terms []string, tagIDs []int64, limit int) (string, []interface{}) {
	args := make([]interface{}, 0, len(terms)+2)

	tagScoreParts := make([]string, 0, len(terms))
	titleScoreParts := make([]string, 0, len(terms))
	contentScoreParts := make([]string, 0, len(terms))
	whereParts := make([]string, 0, len(terms))

	for i, term := range terms {
		args = append(args, "%"+term+"%")
		n := i + 1
		// タグ名が一致する数に3点
		tagScoreParts = append(tagScoreParts, fmt.Sprintf(
			`(SELECT COALESCE(COUNT(*), 0) FROM tags _t JOIN press_release_tags _prt ON _t.id = _prt.tag_id WHERE _prt.press_release_id = pr.id AND _t.name ILIKE $%d)::int`, n))
		// タイトル一致で2点
		titleScoreParts = append(titleScoreParts, fmt.Sprintf(
			`(CASE WHEN pr.title ILIKE $%d THEN 1 ELSE 0 END)`, n))
		// 本文一致で1点
		contentScoreParts = append(contentScoreParts, fmt.Sprintf(
			`(CASE WHEN CAST(pr.content AS TEXT) ILIKE $%d THEN 1 ELSE 0 END)`, n))
		// いずれかのフィールドでマッチすれば候補
		whereParts = append(whereParts, fmt.Sprintf(
			`(pr.title ILIKE $%d OR CAST(pr.content AS TEXT) ILIKE $%d OR EXISTS (SELECT 1 FROM tags _t2 JOIN press_release_tags _prt2 ON _t2.id = _prt2.tag_id WHERE _prt2.press_release_id = pr.id AND _t2.name ILIKE $%d))`,
			n, n, n))
	}

	scoreExpr := fmt.Sprintf(
		`((%s) * 3 + (%s) * 2 + (%s) * 1)::float`,
		strings.Join(tagScoreParts, " + "),
		strings.Join(titleScoreParts, " + "),
		strings.Join(contentScoreParts, " + "),
	)

	// 選択済みタグがある場合はANDフィルタ追加
	tagFilterClause := ""
	if len(tagIDs) > 0 {
		tagArgIdx := len(terms) + 1
		args = append(args, tagIDs)
		tagFilterClause = fmt.Sprintf(
			` AND EXISTS (SELECT 1 FROM press_release_tags _prt3 WHERE _prt3.press_release_id = pr.id AND _prt3.tag_id = ANY($%d))`,
			tagArgIdx)
	}

	limitArgIdx := len(args) + 1
	args = append(args, limit)

	qSQL := fmt.Sprintf(
		`SELECT pr.id, pr.title, COALESCE(pr.main_image_url, '') as main_image_url,
			COALESCE(pr.excerpt, substring(pr.content for 200)) as excerpt,
			pr.created_at, %s as score
		FROM press_releases pr
		WHERE (%s)%s
		ORDER BY score DESC, pr.created_at DESC
		LIMIT $%d`,
		scoreExpr,
		strings.Join(whereParts, " OR "),
		tagFilterClause,
		limitArgIdx,
	)
	return qSQL, args
}

// GET /api/v1/recommend?q=&tag_ids=&limit=
func RecommendHandler(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	tagsParam := strings.TrimSpace(r.URL.Query().Get("tag_ids"))
	limitStr := r.URL.Query().Get("limit")
	limit := 8
	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil && v > 0 {
			limit = v
		}
	}

	pool := db.GetDB()
	ctx := context.Background()

	// parse tag_ids param into []int64; empty/invalid entries are ignored
	var tagIDs []int64
	for _, s := range strings.Split(tagsParam, ",") {
		if v, err := strconv.ParseInt(strings.TrimSpace(s), 10, 64); err == nil && v > 0 {
			tagIDs = append(tagIDs, v)
		}
	}

	var rows pgx.Rows
	var err error

	switch {
	case q != "":
		// キーワードあり（タグ選択との併用も含む）
		// タグ名:3点 / タイトル:2点 / 本文:1点 のスコアリング
		terms := splitSearchTerms(q)
		if len(terms) == 0 {
			terms = []string{q}
		}
		qSQL, args := buildKeywordQuery(terms, tagIDs, limit)
		rows, err = pool.Query(ctx, qSQL, args...)
	case len(tagIDs) > 0:
		// 選択タグのみ: マッチするタグ数が多い順で表示
		rows, err = pool.Query(ctx, `
			SELECT pr.id, pr.title, COALESCE(pr.main_image_url, '') as main_image_url, COALESCE(pr.excerpt, substring(pr.content for 200)) as excerpt, pr.created_at, COUNT(DISTINCT prt.tag_id) as tag_match_count
			FROM press_releases pr
			JOIN press_release_tags prt ON pr.id = prt.press_release_id
			WHERE prt.tag_id = ANY($1)
			GROUP BY pr.id
			ORDER BY tag_match_count DESC, pr.created_at DESC
			LIMIT $2`, tagIDs, limit)
	default:
		rows, err = pool.Query(ctx, `
			SELECT id, title, COALESCE(main_image_url, '') as main_image_url, COALESCE(excerpt, substring(content for 200)) as excerpt, created_at, 0 as rank
			FROM press_releases
			ORDER BY created_at DESC
			LIMIT $1`, limit)
	}

	if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	defer rows.Close()

	items := []map[string]interface{}{}
	for rows.Next() {
		var id int
		var title string
		var img sql.NullString
		var excerpt sql.NullString
		var publishedAt interface{}
		var scoreVal float64
		if err := rows.Scan(&id, &title, &img, &excerpt, &publishedAt, &scoreVal); err != nil {
			continue
		}
		tags, _ := fetchTagsForPR(ctx, id)
		var imgVal interface{}
		if img.Valid && img.String != "" {
			imgVal = img.String
		} else {
			imgVal = nil
		}
		items = append(items, map[string]interface{}{
			"id":           id,
			"title":        title,
			"mainImageUrl": imgVal,
			"excerpt": func() string {
				if excerpt.Valid {
					return excerpt.String
				}
				return ""
			}(),
			"publishedAt": publishedAt,
			"tags":        tags,
			"score":       scoreVal,
		})
	}

	httputil.RespondWithJSON(w, http.StatusOK, items)
}

// GET /api/v1/press_releases/{id}/similar?limit=
func SimilarPressReleasesHandler(w http.ResponseWriter, r *http.Request) {
	// read id from path param
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		httputil.RespondWithError(w, http.StatusBadRequest, "MISSING_ID", "Missing id parameter")
		return
	}
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid id")
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 8
	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil && v > 0 {
			limit = v
		}
	}

	pool := db.GetDB()
	ctx := context.Background()

	// get tag ids for target
	tagRows, err := pool.Query(ctx, "SELECT tag_id FROM press_release_tags WHERE press_release_id = $1", id)
	if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	defer tagRows.Close()
	var tagIDs []int
	for tagRows.Next() {
		var tid int
		if err := tagRows.Scan(&tid); err == nil {
			tagIDs = append(tagIDs, tid)
		}
	}

	items := []map[string]interface{}{}
	selected := map[int]bool{}

	if len(tagIDs) > 0 {
		// tag-based matches
		rows, err := pool.Query(ctx, `
            SELECT pr.id, pr.title, COALESCE(pr.main_image_url, '') as main_image_url, COALESCE(pr.excerpt, substring(pr.content for 200)) as excerpt, pr.created_at, COUNT(*) as tag_count
            FROM press_releases pr
            JOIN press_release_tags prt ON pr.id = prt.press_release_id
            WHERE prt.tag_id = ANY($1) AND pr.id != $2
            GROUP BY pr.id
            ORDER BY tag_count DESC, pr.created_at DESC
            LIMIT $3`, tagIDs, id, limit)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var pid int
				var title, img, excerpt string
				var publishedAt interface{}
				var tagCount int
				if err := rows.Scan(&pid, &title, &img, &excerpt, &publishedAt, &tagCount); err != nil {
					continue
				}
				tags, _ := fetchTagsForPR(ctx, pid)
				items = append(items, map[string]interface{}{
					"id":           pid,
					"title":        title,
					"mainImageUrl": img,
					"excerpt":      excerpt,
					"publishedAt":  publishedAt,
					"tags":         tags,
					"score":        tagCount,
				})
				selected[pid] = true
			}
		}
	}

	if len(items) < limit {
		// fill by text similarity
		// get content of target
		var content string
		err := pool.QueryRow(ctx, "SELECT content FROM press_releases WHERE id = $1", id).Scan(&content)
		if err == nil {
			q := content
			rows, err := pool.Query(ctx, `
                SELECT pr.id, pr.title, COALESCE(pr.main_image_url, '') as main_image_url, COALESCE(pr.excerpt, substring(pr.content for 200)) as excerpt, pr.created_at, ts_rank(pr.document_tsv, plainto_tsquery('simple', $1)) as rank
                FROM press_releases pr
                WHERE pr.document_tsv @@ plainto_tsquery('simple', $1) AND pr.id != $2
                ORDER BY rank DESC, pr.created_at DESC
                LIMIT $3`, q, id, limit)
			if err == nil {
				defer rows.Close()
				for rows.Next() {
					var pid int
					var title, img, excerpt string
					var publishedAt interface{}
					var rank float64
					if err := rows.Scan(&pid, &title, &img, &excerpt, &publishedAt, &rank); err != nil {
						continue
					}
					if selected[pid] {
						continue
					}
					tags, _ := fetchTagsForPR(ctx, pid)
					items = append(items, map[string]interface{}{
						"id":           pid,
						"title":        title,
						"mainImageUrl": img,
						"excerpt":      excerpt,
						"publishedAt":  publishedAt,
						"tags":         tags,
						"score":        rank,
					})
					selected[pid] = true
					if len(items) >= limit {
						break
					}
				}
			}
		}
	}

	httputil.RespondWithJSON(w, http.StatusOK, items)
}

// helper: fetch tag names for a press release
func fetchTagsForPR(ctx context.Context, prID int) ([]string, error) {
	pool := db.GetDB()
	rows, err := pool.Query(ctx, "SELECT t.name FROM tags t JOIN press_release_tags prt ON t.id = prt.tag_id WHERE prt.press_release_id = $1", prID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tags []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err == nil {
			tags = append(tags, name)
		}
	}
	return tags, nil
}
