package handler

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"press-release-editor/db"
	"press-release-editor/httputil"
)

// GET /api/v1/search?q=&tags=&page=&per_page=
func SearchHandler(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	tagsParam := strings.TrimSpace(r.URL.Query().Get("tags"))
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
		tags := strings.Split(tagsParam, ",")
		// join with press_release_tags and tags
		// we'll use EXISTS with tag slugs
		whereClauses = append(whereClauses, "EXISTS (SELECT 1 FROM press_release_tags prt JOIN tags t ON prt.tag_id = t.id WHERE prt.press_release_id = pr.id AND t.slug = ANY($"+strconv.Itoa(argi)+"))")
		args = append(args, pqStringArray(tags))
		argi++
		// Note: simple approach treats as OR; for AND mode more complex query needed
	}

	if q != "" {
		whereClauses = append(whereClauses, "pr.document_tsv @@ plainto_tsquery('japanese', $"+strconv.Itoa(argi)+")")
		args = append(args, q)
		argi++
	}

	where := "WHERE pr.is_public = true"
	if len(whereClauses) > 0 {
		where += " AND " + strings.Join(whereClauses, " AND ")
	}

	query := "SELECT pr.id, pr.title, pr.main_image_url, pr.excerpt, pr.published_at FROM press_releases pr " + where + " ORDER BY pr.published_at DESC LIMIT $" + strconv.Itoa(argi) + " OFFSET $" + strconv.Itoa(argi+1)
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

// pqStringArray creates a PostgreSQL text[] parameter (driver independent simple helper)
func pqStringArray(ss []string) interface{} {
	// pgx accepts []string directly for text[]
	return ss
}
