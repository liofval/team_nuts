package handler

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"press-release-editor/db"
	"press-release-editor/httputil"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

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
	case len(tagIDs) > 0:
		rows, err = pool.Query(ctx, `
            SELECT pr.id, pr.title, COALESCE(pr.main_image_url, '') as main_image_url, COALESCE(pr.excerpt, substring(pr.content for 200)) as excerpt, pr.created_at
            FROM press_releases pr
            JOIN press_release_tags prt ON pr.id = prt.press_release_id
            WHERE prt.tag_id = ANY($1)
            GROUP BY pr.id
            ORDER BY COUNT(DISTINCT prt.tag_id) DESC, pr.created_at DESC
            LIMIT $2`, tagIDs, limit)
	case q != "":
		rows, err = pool.Query(ctx, `
            SELECT pr.id, pr.title, COALESCE(pr.main_image_url, '') as main_image_url, COALESCE(pr.excerpt, substring(pr.content for 200)) as excerpt, pr.created_at
            FROM press_releases pr
            WHERE pr.document_tsv @@ plainto_tsquery('simple', $1)
            ORDER BY ts_rank(pr.document_tsv, plainto_tsquery('simple', $1)) DESC, pr.created_at DESC
            LIMIT $2`, q, limit)
	default:
		rows, err = pool.Query(ctx, `
            SELECT id, title, COALESCE(main_image_url, '') as main_image_url, COALESCE(excerpt, substring(content for 200)) as excerpt, created_at
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
		var title, img, excerpt string
		var publishedAt interface{}
		if err := rows.Scan(&id, &title, &img, &excerpt, &publishedAt); err != nil {
			continue
		}
		tags, _ := fetchTagsForPR(ctx, id)
		items = append(items, map[string]interface{}{
			"id":           id,
			"title":        title,
			"mainImageUrl": img,
			"excerpt":      excerpt,
			"publishedAt":  publishedAt,
			"tags":         tags,
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
