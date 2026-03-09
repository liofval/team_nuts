package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

// PressRelease はプレスリリースのデータ構造
type PressRelease struct {
	ID        int    `json:"id"`
	Title     string `json:"title"`
	Content   string `json:"content"` // TipTap形式のJSON文字列
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// SavePressReleaseRequest はプレスリリース保存リクエストのデータ構造
type SavePressReleaseRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

// GetPressReleaseHandler はプレスリリースを取得するハンドラー
// GET /press-releases/:id
func GetPressReleaseHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		respondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid ID")
		return
	}

	db := GetDB()
	var pr PressRelease
	var contentStr string
	var createdAt time.Time
	var updatedAt time.Time

	err = db.QueryRow(
		context.Background(),
		"SELECT id, title, content, created_at, updated_at FROM press_releases WHERE id = $1",
		id,
	).Scan(&pr.ID, &pr.Title, &contentStr, &createdAt, &updatedAt)

	if err == pgx.ErrNoRows {
		respondWithError(w, http.StatusNotFound, "NOT_FOUND", "Press release not found")
		return
	} else if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	pr.Content = contentStr
	pr.CreatedAt = formatTimestamp(createdAt)
	pr.UpdatedAt = formatTimestamp(updatedAt)

	respondWithJSON(w, http.StatusOK, pr)
}

// SavePressReleaseHandler はプレスリリースを保存（更新）するハンドラー
// POST /press-releases/:id
func SavePressReleaseHandler(w http.ResponseWriter, r *http.Request) {
	const maxRequestBodyBytes = 1 << 20 // 1MB

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		respondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid ID")
		return
	}

	limitedBody := http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)
	body, err := io.ReadAll(limitedBody)
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			respondWithError(w, http.StatusRequestEntityTooLarge, "BODY_TOO_LARGE", "Request body too large")
			return
		}

		respondWithError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON")
		return
	}

	var payload interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON")
		return
	}

	data, ok := payload.(map[string]interface{})
	if !ok {
		data = map[string]interface{}{}
	}

	titleRaw, titleExists := data["title"]
	contentRaw, contentExists := data["content"]

	title, titleOK := titleRaw.(string)
	content, contentOK := contentRaw.(string)

	if !titleExists || !contentExists || !titleOK || !contentOK {
		respondWithError(w, http.StatusBadRequest, "MISSING_REQUIRED_FIELDS", "Title and content are required")
		return
	}
	req := SavePressReleaseRequest{
		Title:   title,
		Content: content,
	}

	db := GetDB()
	ctx := context.Background()

	var exists bool
	err = db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM press_releases WHERE id = $1)", id).Scan(&exists)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	if !exists {
		respondWithError(w, http.StatusNotFound, "NOT_FOUND", "Press release not found")
		return
	}

	_, err = db.Exec(
		ctx,
		`UPDATE press_releases
		 SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $3`,
		req.Title,
		req.Content,
		id,
	)

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	var pressRelease PressRelease
	var createdAt time.Time
	var updatedAt time.Time
	err = db.QueryRow(
		ctx,
		"SELECT id, title, content, created_at, updated_at FROM press_releases WHERE id = $1",
		id,
	).Scan(&pressRelease.ID, &pressRelease.Title, &pressRelease.Content, &createdAt, &updatedAt)

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	pressRelease.CreatedAt = formatTimestamp(createdAt)
	pressRelease.UpdatedAt = formatTimestamp(updatedAt)

	respondWithJSON(w, http.StatusOK, pressRelease)
}
