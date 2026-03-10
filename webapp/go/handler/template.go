package handler

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"press-release-editor/db"
	"press-release-editor/httputil"
	"press-release-editor/model"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

// parseTemplateRequest はリクエストボディからテンプレートデータをパースする
func parseTemplateRequest(r *http.Request) (*model.SaveTemplateRequest, int, string, string) {
	const maxRequestBodyBytes = 1 << 20 // 1MB

	limitedBody := http.MaxBytesReader(nil, r.Body, maxRequestBodyBytes)
	body, err := io.ReadAll(limitedBody)
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			return nil, http.StatusRequestEntityTooLarge, "BODY_TOO_LARGE", "Request body too large"
		}
		return nil, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON"
	}

	var req model.SaveTemplateRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return nil, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON"
	}

	if req.Name == "" {
		return nil, http.StatusBadRequest, "MISSING_REQUIRED_FIELDS", "Name is required"
	}

	return &req, 0, "", ""
}

// ListTemplatesHandler はテンプレート一覧を取得するハンドラー
// GET /templates
func ListTemplatesHandler(w http.ResponseWriter, r *http.Request) {
	pool := db.GetDB()
	ctx := context.Background()

	rows, err := pool.Query(ctx,
		"SELECT id, name, title, content, created_at, updated_at FROM templates ORDER BY updated_at DESC",
	)
	if err != nil {
		log.Printf("ListTemplatesHandler: query error: %v", err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	defer rows.Close()

	templates := []model.Template{}
	for rows.Next() {
		var t model.Template
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&t.ID, &t.Name, &t.Title, &t.Content, &createdAt, &updatedAt); err != nil {
			log.Printf("ListTemplatesHandler: row scan error: %v", err)
			httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
			return
		}
		t.CreatedAt = httputil.FormatTimestamp(createdAt)
		t.UpdatedAt = httputil.FormatTimestamp(updatedAt)
		templates = append(templates, t)
	}

	httputil.RespondWithJSON(w, http.StatusOK, templates)
}

// GetTemplateHandler はテンプレートを取得するハンドラー
// GET /templates/{id}
func GetTemplateHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid ID")
		return
	}

	pool := db.GetDB()
	var t model.Template
	var createdAt, updatedAt time.Time

	err = pool.QueryRow(
		context.Background(),
		"SELECT id, name, title, content, created_at, updated_at FROM templates WHERE id = $1",
		id,
	).Scan(&t.ID, &t.Name, &t.Title, &t.Content, &createdAt, &updatedAt)

	if err == pgx.ErrNoRows {
		httputil.RespondWithError(w, http.StatusNotFound, "NOT_FOUND", "Template not found")
		return
	} else if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	t.CreatedAt = httputil.FormatTimestamp(createdAt)
	t.UpdatedAt = httputil.FormatTimestamp(updatedAt)

	httputil.RespondWithJSON(w, http.StatusOK, t)
}

// CreateTemplateHandler はテンプレートを新規作成するハンドラー
// POST /templates
func CreateTemplateHandler(w http.ResponseWriter, r *http.Request) {
	req, status, code, message := parseTemplateRequest(r)
	if req == nil {
		httputil.RespondWithError(w, status, code, message)
		return
	}

	pool := db.GetDB()
	ctx := context.Background()

	var t model.Template
	var createdAt, updatedAt time.Time
	err := pool.QueryRow(
		ctx,
		`INSERT INTO templates (name, title, content)
		 VALUES ($1, $2, $3)
		 RETURNING id, name, title, content, created_at, updated_at`,
		req.Name, req.Title, req.Content,
	).Scan(&t.ID, &t.Name, &t.Title, &t.Content, &createdAt, &updatedAt)

	if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	t.CreatedAt = httputil.FormatTimestamp(createdAt)
	t.UpdatedAt = httputil.FormatTimestamp(updatedAt)

	httputil.RespondWithJSON(w, http.StatusCreated, t)
}

// UpdateTemplateHandler はテンプレートを更新するハンドラー
// PUT /templates/{id}
func UpdateTemplateHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid ID")
		return
	}

	req, status, code, message := parseTemplateRequest(r)
	if req == nil {
		httputil.RespondWithError(w, status, code, message)
		return
	}

	pool := db.GetDB()
	ctx := context.Background()

	var t model.Template
	var createdAt, updatedAt time.Time
	err = pool.QueryRow(
		ctx,
		`UPDATE templates
		 SET name = $1, title = $2, content = $3, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $4
		 RETURNING id, name, title, content, created_at, updated_at`,
		req.Name, req.Title, req.Content, id,
	).Scan(&t.ID, &t.Name, &t.Title, &t.Content, &createdAt, &updatedAt)

	if err == pgx.ErrNoRows {
		httputil.RespondWithError(w, http.StatusNotFound, "NOT_FOUND", "Template not found")
		return
	} else if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	t.CreatedAt = httputil.FormatTimestamp(createdAt)
	t.UpdatedAt = httputil.FormatTimestamp(updatedAt)

	httputil.RespondWithJSON(w, http.StatusOK, t)
}

// DeleteTemplateHandler はテンプレートを削除するハンドラー
// DELETE /templates/{id}
func DeleteTemplateHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid ID")
		return
	}

	pool := db.GetDB()
	ctx := context.Background()

	tag, err := pool.Exec(ctx, "DELETE FROM templates WHERE id = $1", id)
	if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	if tag.RowsAffected() == 0 {
		httputil.RespondWithError(w, http.StatusNotFound, "NOT_FOUND", "Template not found")
		return
	}

	httputil.RespondWithJSON(w, http.StatusOK, httputil.SuccessResponse{Message: "Template deleted"})
}
