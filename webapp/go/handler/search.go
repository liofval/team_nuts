package handler

import (
	"context"
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

	// Basic search: if tags provided, filter by tags (AND). If q provided, add text search.
	var whereClauses []string
	var args []interface{}
	argi := 1

	if tagsParam != "" {
		var tagIDs []int64
		for _, s := range strings.Split(tagsParam, ",") {
			if v, err := strconv.ParseInt(strings.TrimSpace(s), 10, 64); err == nil && v > 0 {
				tagIDs = append(tagIDs, v)
			}
		}
		if len(tagIDs) > 0 {
			whereClauses = append(whereClauses, "EXISTS (SELECT 1 FROM press_release_tags prt WHERE prt.press_release_id = pr.id AND prt.tag_id = ANY($"+strconv.Itoa(argi)+"))")
			args = append(args, tagIDs)
			argi++
		}
	}

	if q != "" {
		// use 'simple' config to avoid requiring additional text search configs
		whereClauses = append(whereClauses, "pr.document_tsv @@ plainto_tsquery('simple', $"+strconv.Itoa(argi)+")")
		args = append(args, q)
		argi++
	}

	// Some deployments may not have `is_public`/`published_at` columns.
	// Use `created_at` as a stable ordering column and avoid filtering by `is_public`.
	where := "WHERE 1=1"
	if len(whereClauses) > 0 {
		where += " AND " + strings.Join(whereClauses, " AND ")
	}

	query := "SELECT pr.id, pr.title, COALESCE(pr.main_image_url, '') as main_image_url, COALESCE(pr.excerpt, '') as excerpt, pr.created_at FROM press_releases pr " + where + " ORDER BY pr.created_at DESC LIMIT $" + strconv.Itoa(argi) + " OFFSET $" + strconv.Itoa(argi+1)
	args = append(args, perPage, offset)

	rows, err := pool.Query(ctx, query, args...)
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
		items = append(items, map[string]interface{}{
			"id":             id,
			"title":          title,
			"main_image_url": img,
			"excerpt":        excerpt,
			"published_at":   publishedAt,
		})
	}

	httputil.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"total":    len(items),
		"page":     page,
		"per_page": perPage,
		"items":    items,
	})
}
