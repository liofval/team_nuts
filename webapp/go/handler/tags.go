package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"press-release-editor/db"
	"press-release-editor/httputil"
	"press-release-editor/model"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// GET /api/v1/tags/suggest?q=&type=&limit=
func SuggestTagsHandler(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	t := strings.TrimSpace(r.URL.Query().Get("type"))
	limitStr := r.URL.Query().Get("limit")
	limit := 10
	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil && v > 0 {
			limit = v
		}
	}

	pool := db.GetDB()
	ctx := context.Background()

	var rows pgx.Rows
	var err error

	if q == "" {
		// top by usage
		if t == "" {
			rows, err = pool.Query(ctx, `
                SELECT tags.id, tags.name, tags.slug, tags.type, COALESCE(cnt.c,0) as count
                FROM tags
                LEFT JOIN (
                  SELECT tag_id, COUNT(*) as c FROM press_release_tags GROUP BY tag_id
                ) cnt ON tags.id = cnt.tag_id
                ORDER BY cnt.c DESC NULLS LAST
                LIMIT $1`, limit)
		} else {
			rows, err = pool.Query(ctx, `
                SELECT tags.id, tags.name, tags.slug, tags.type, COALESCE(cnt.c,0) as count
                FROM tags
                LEFT JOIN (
                  SELECT tag_id, COUNT(*) as c FROM press_release_tags GROUP BY tag_id
                ) cnt ON tags.id = cnt.tag_id
                WHERE tags.type = $2
                ORDER BY cnt.c DESC NULLS LAST
                LIMIT $1`, limit, t)
		}
	} else {
		// prefix match
		prefix := q + "%"
		if t == "" {
			rows, err = pool.Query(ctx, `
                SELECT tags.id, tags.name, tags.slug, tags.type, COALESCE(cnt.c,0) as count
                FROM tags
                LEFT JOIN (
                  SELECT tag_id, COUNT(*) as c FROM press_release_tags GROUP BY tag_id
                ) cnt ON tags.id = cnt.tag_id
                WHERE lower(tags.name) LIKE lower($1)
                ORDER BY cnt.c DESC NULLS LAST
                LIMIT $2`, prefix, limit)
		} else {
			rows, err = pool.Query(ctx, `
                SELECT tags.id, tags.name, tags.slug, tags.type, COALESCE(cnt.c,0) as count
                FROM tags
                LEFT JOIN (
                  SELECT tag_id, COUNT(*) as c FROM press_release_tags GROUP BY tag_id
                ) cnt ON tags.id = cnt.tag_id
                WHERE lower(tags.name) LIKE lower($1) AND tags.type = $2
                ORDER BY cnt.c DESC NULLS LAST
                LIMIT $3`, prefix, t, limit)
		}
	}

	if err != nil {
		log.Printf("SuggestTagsHandler: query error: %v", err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	defer rows.Close()

	items := make([]model.Tag, 0)
	for rows.Next() {
		var tg model.Tag
		var cnt int
		if err := rows.Scan(&tg.ID, &tg.Name, &tg.Slug, &tg.Type, &cnt); err != nil {
			log.Printf("SuggestTagsHandler: rows.Scan error: %v", err)
			continue
		}
		tg.Count = cnt
		items = append(items, tg)
	}
	if err := rows.Err(); err != nil {
		log.Printf("SuggestTagsHandler: rows iteration error: %v", err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	httputil.RespondWithJSON(w, http.StatusOK, map[string]interface{}{"items": items})
}

// POST /api/v1/press_release/{id}/tags
func AssignTagsHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid ID")
		return
	}

	var req model.AssignTagsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON")
		return
	}

	pool := db.GetDB()
	ctx := context.Background()

	tx, err := pool.Begin(ctx)
	if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	defer tx.Rollback(ctx)

	// ensure press release exists
	var exists bool
	if err := tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM press_releases WHERE id=$1)", id).Scan(&exists); err != nil || !exists {
		httputil.RespondWithError(w, http.StatusNotFound, "NOT_FOUND", "Press release not found")
		return
	}

	for _, name := range req.Tags {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		slug := strings.ToLower(strings.ReplaceAll(name, " ", "-"))

		var tagID int
		// try find
		err := tx.QueryRow(ctx, "SELECT id FROM tags WHERE slug = $1", slug).Scan(&tagID)
		if err == pgx.ErrNoRows {
			if req.CreateMissing {
				// create
				err = tx.QueryRow(ctx, "INSERT INTO tags (name, slug, type, created_at) VALUES ($1,$2,$3,NOW()) RETURNING id", name, slug, "tag").Scan(&tagID)
				if err != nil {
					continue
				}
			} else {
				continue
			}
		} else if err != nil {
			continue
		}

		// insert into press_release_tags if not exists
		_, _ = tx.Exec(ctx, "INSERT INTO press_release_tags (press_release_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", id, tagID)
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("AssignTagsHandler: commit error press_release_id=%d err=%v", id, err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	// return assigned tags for the press release
	rows2, err := pool.Query(ctx, `
		SELECT t.id, t.name, t.slug, t.type, COALESCE(cnt.c,0) as count
		FROM tags t
		LEFT JOIN (
		  SELECT tag_id, COUNT(*) as c FROM press_release_tags GROUP BY tag_id
		) cnt ON t.id = cnt.tag_id
		WHERE t.id IN (SELECT tag_id FROM press_release_tags WHERE press_release_id = $1)
		ORDER BY t.name`, id)
	if err != nil {
		httputil.RespondWithJSON(w, http.StatusOK, map[string]interface{}{"status": "ok"})
		return
	}
	defer rows2.Close()
	var assigned []model.Tag
	for rows2.Next() {
		var tg model.Tag
		var cnt int
		if err := rows2.Scan(&tg.ID, &tg.Name, &tg.Slug, &tg.Type, &cnt); err != nil {
			continue
		}
		tg.Count = cnt
		assigned = append(assigned, tg)
	}

	httputil.RespondWithJSON(w, http.StatusOK, map[string]interface{}{"status": "ok", "assigned": assigned})
}

// PUT /api/v1/press_release/{id}/tags/{tag_id}
func UpdateTagHandler(w http.ResponseWriter, r *http.Request) {
	// update tag properties (name/slug/type)
	tagIDStr := chi.URLParam(r, "tag_id")
	tagID, err := strconv.Atoi(tagIDStr)
	if err != nil || tagID <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid tag id")
		return
	}

	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON")
		return
	}

	name, _ := payload["name"].(string)
	slug, _ := payload["slug"].(string)
	typ, _ := payload["type"].(string)

	pool := db.GetDB()
	ctx := context.Background()

	// build update
	sets := []string{}
	args := []interface{}{}
	i := 1
	if name != "" {
		sets = append(sets, "name = $"+strconv.Itoa(i))
		args = append(args, name)
		i++
	}
	if slug != "" {
		sets = append(sets, "slug = $"+strconv.Itoa(i))
		args = append(args, slug)
		i++
	}
	if typ != "" {
		sets = append(sets, "type = $"+strconv.Itoa(i))
		args = append(args, typ)
		i++
	}
	if len(sets) == 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "NO_FIELDS", "No updatable fields")
		return
	}
	args = append(args, tagID)

	query := "UPDATE tags SET " + strings.Join(sets, ", ") + " WHERE id = $" + strconv.Itoa(i)

	if _, err := pool.Exec(ctx, query, args...); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			httputil.RespondWithError(w, http.StatusConflict, "DUPLICATE_SLUG", "A tag with that slug already exists")
			return
		}
		log.Printf("UpdateTagHandler: update error tag_id=%d err=%v", tagID, err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	// fetch updated tag and return it
	var tg model.Tag
	err = pool.QueryRow(ctx, `
		SELECT t.id, t.name, t.slug, t.type, COALESCE(cnt.c,0) as count, to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM tags t
		LEFT JOIN (
		  SELECT tag_id, COUNT(*) as c FROM press_release_tags GROUP BY tag_id
		) cnt ON t.id = cnt.tag_id
		WHERE t.id = $1`, tagID).Scan(&tg.ID, &tg.Name, &tg.Slug, &tg.Type, &tg.Count, &tg.CreatedAt)
	if err != nil {
		httputil.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		return
	}

	httputil.RespondWithJSON(w, http.StatusOK, map[string]interface{}{"status": "ok", "tag": tg})
}

// DELETE /api/v1/press_release/{id}/tags/{tag_id}
func DeleteTagAssignmentHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid ID")
		return
	}
	tagIDStr := chi.URLParam(r, "tag_id")
	tagID, err := strconv.Atoi(tagIDStr)
	if err != nil || tagID <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_TAG_ID", "Invalid tag id")
		return
	}

	pool := db.GetDB()
	ctx := context.Background()

	_, err = pool.Exec(ctx, "DELETE FROM press_release_tags WHERE press_release_id = $1 AND tag_id = $2", id, tagID)
	if err != nil {
		log.Printf("DeleteTagAssignmentHandler: delete error press_release_id=%d tag_id=%d err=%v", id, tagID, err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	httputil.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
