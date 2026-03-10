package handler

import (
	"context"
	"database/sql"
	"net/http"
	"strconv"
	"strings"

	"press-release-editor/db"
	"press-release-editor/httputil"
)

// GET /api/v1/search?q=&tag_ids=&page=&per_page=
func SearchHandler(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	tagsParam := strings.TrimSpace(r.URL.Query().Get("tag_ids"))
	pageStr := r.URL.Query().Get("page")
	perPageStr := r.URL.Query().Get("per_page")
	page := 1
	perPage := 20
	if pageStr != "" {
		if v, err := strconv.Atoi(pageStr); err == nil && v > 0 {
			page = v
		}
	}
	if perPageStr != "" {
		if v, err := strconv.Atoi(perPageStr); err == nil && v > 0 {
			perPage = v
		}
	}
	offset := (page - 1) * perPage

	pool := db.GetDB()
	ctx := context.Background()

	// parse tag ids
	var tagIDs []int64
	if tagsParam != "" {
		for _, s := range strings.Split(tagsParam, ",") {
			if v, err := strconv.ParseInt(strings.TrimSpace(s), 10, 64); err == nil && v > 0 {
				tagIDs = append(tagIDs, v)
			}
		}
	}

	// Branching search logic for clearer SQL and correct counts/scores
	total := 0
	items := []map[string]interface{}{}

	if q == "" && len(tagIDs) > 0 {
		// tag-only search: get total count
		err := pool.QueryRow(ctx, "SELECT COUNT(DISTINCT pr.id) FROM press_releases pr JOIN press_release_tags prt ON pr.id = prt.press_release_id WHERE prt.tag_id = ANY($1)", tagIDs).Scan(&total)
		if err != nil {
			httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
			return
		}

		rows, err := pool.Query(ctx, `
			SELECT pr.id, pr.title, COALESCE(pr.main_image_url, '') as main_image_url, COALESCE(pr.excerpt, substring(pr.content for 200)) as excerpt, pr.created_at, COUNT(DISTINCT prt.tag_id) as tag_match_count, array_agg(DISTINCT t.name) as matched_tags
			FROM press_releases pr
			JOIN press_release_tags prt ON pr.id = prt.press_release_id
			JOIN tags t ON t.id = prt.tag_id
			WHERE prt.tag_id = ANY($1)
			GROUP BY pr.id
			ORDER BY tag_match_count DESC, pr.created_at DESC
			LIMIT $2 OFFSET $3`, tagIDs, perPage, offset)
		if err != nil {
			httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
			return
		}
		defer rows.Close()
		for rows.Next() {
			var id int
			var title string
			var img sql.NullString
			var excerpt sql.NullString
			var publishedAt interface{}
			var tagMatchCount int
			var matchedTags []string
			if err := rows.Scan(&id, &title, &img, &excerpt, &publishedAt, &tagMatchCount, &matchedTags); err != nil {
				continue
			}
			var imgVal interface{}
			if img.Valid && img.String != "" {
				imgVal = img.String
			} else {
				imgVal = nil
			}
			items = append(items, map[string]interface{}{
				"id":             id,
				"title":          title,
				"main_image_url": imgVal,
				"excerpt": func() string {
					if excerpt.Valid {
						return excerpt.String
					}
					return ""
				}(),
				"published_at": publishedAt,
				"matched_tags": matchedTags,
				"score":        float64(tagMatchCount),
			})
		}

	} else if q != "" {
		// text search (with optional tag filter)
		// total count
		if len(tagIDs) > 0 {
			err := pool.QueryRow(ctx, "SELECT COUNT(DISTINCT pr.id) FROM press_releases pr WHERE pr.document_tsv @@ plainto_tsquery('simple', $1) AND EXISTS (SELECT 1 FROM press_release_tags prt WHERE prt.press_release_id = pr.id AND prt.tag_id = ANY($2))", q, tagIDs).Scan(&total)
			if err != nil {
				httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
				return
			}
			rows, err := pool.Query(ctx, `
				SELECT pr.id, pr.title, COALESCE(pr.main_image_url, '') as main_image_url, COALESCE(pr.excerpt, substring(pr.content for 200)) as excerpt, pr.created_at, ts_rank(pr.document_tsv, plainto_tsquery('simple', $1)) as rank, (SELECT array_agg(t.name) FROM tags t JOIN press_release_tags prt ON t.id = prt.tag_id WHERE prt.press_release_id = pr.id AND t.id = ANY($2)) as matched_tags
				FROM press_releases pr
				WHERE pr.document_tsv @@ plainto_tsquery('simple', $1) AND EXISTS (SELECT 1 FROM press_release_tags prt WHERE prt.press_release_id = pr.id AND prt.tag_id = ANY($2))
				ORDER BY rank DESC, pr.created_at DESC
				LIMIT $3 OFFSET $4`, q, tagIDs, perPage, offset)
			if err != nil {
				httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
				return
			}
			defer rows.Close()
			for rows.Next() {
				var id int
				var title string
				var img sql.NullString
				var excerpt sql.NullString
				var publishedAt interface{}
				var rank float64
				var matchedTags []string
				if err := rows.Scan(&id, &title, &img, &excerpt, &publishedAt, &rank, &matchedTags); err != nil {
					continue
				}
				var imgVal interface{}
				if img.Valid && img.String != "" {
					imgVal = img.String
				} else {
					imgVal = nil
				}
				items = append(items, map[string]interface{}{
					"id":             id,
					"title":          title,
					"main_image_url": imgVal,
					"excerpt": func() string {
						if excerpt.Valid {
							return excerpt.String
						}
						return ""
					}(),
					"published_at": publishedAt,
					"matched_tags": matchedTags,
					"score":        rank,
				})
			}
		} else {
			// total
			err := pool.QueryRow(ctx, "SELECT COUNT(DISTINCT pr.id) FROM press_releases pr WHERE pr.document_tsv @@ plainto_tsquery('simple', $1)", q).Scan(&total)
			if err != nil {
				httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
				return
			}
			rows, err := pool.Query(ctx, `
				SELECT pr.id, pr.title, COALESCE(pr.main_image_url, '') as main_image_url, COALESCE(pr.excerpt, substring(pr.content for 200)) as excerpt, pr.created_at, ts_rank(pr.document_tsv, plainto_tsquery('simple', $1)) as rank
				FROM press_releases pr
				WHERE pr.document_tsv @@ plainto_tsquery('simple', $1)
				ORDER BY rank DESC, pr.created_at DESC
				LIMIT $2 OFFSET $3`, q, perPage, offset)
			if err != nil {
				httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
				return
			}
			defer rows.Close()
			for rows.Next() {
				var id int
				var title string
				var img sql.NullString
				var excerpt sql.NullString
				var publishedAt interface{}
				var rank float64
				if err := rows.Scan(&id, &title, &img, &excerpt, &publishedAt, &rank); err != nil {
					continue
				}
				var imgVal interface{}
				if img.Valid && img.String != "" {
					imgVal = img.String
				} else {
					imgVal = nil
				}
				items = append(items, map[string]interface{}{
					"id":             id,
					"title":          title,
					"main_image_url": imgVal,
					"excerpt": func() string {
						if excerpt.Valid {
							return excerpt.String
						}
						return ""
					}(),
					"published_at": publishedAt,
					"matched_tags": []string{},
					"score":        rank,
				})
			}
		}

	} else {
		// fallback: no q and no tags -> list latest
		err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM press_releases").Scan(&total)
		if err != nil {
			httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
			return
		}
		rows, err := pool.Query(ctx, `
			SELECT pr.id, pr.title, COALESCE(pr.main_image_url, '') as main_image_url, COALESCE(pr.excerpt, substring(pr.content for 200)) as excerpt, pr.created_at
			FROM press_releases pr
			ORDER BY pr.created_at DESC
			LIMIT $1 OFFSET $2`, perPage, offset)
		if err != nil {
			httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
			return
		}
		defer rows.Close()
		for rows.Next() {
			var id int
			var title string
			var img sql.NullString
			var excerpt sql.NullString
			var publishedAt interface{}
			if err := rows.Scan(&id, &title, &img, &excerpt, &publishedAt); err != nil {
				continue
			}
			var imgVal interface{}
			if img.Valid && img.String != "" {
				imgVal = img.String
			} else {
				imgVal = nil
			}
			items = append(items, map[string]interface{}{
				"id":             id,
				"title":          title,
				"main_image_url": imgVal,
				"excerpt": func() string {
					if excerpt.Valid {
						return excerpt.String
					}
					return ""
				}(),
				"published_at": publishedAt,
				"matched_tags": []string{},
				"score":        0.0,
			})
		}
	}

	httputil.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"total":    total,
		"page":     page,
		"per_page": perPage,
		"items":    items,
	})
}
