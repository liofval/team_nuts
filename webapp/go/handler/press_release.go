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
	"press-release-editor/tiptap"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

// GetPressReleaseHandler はプレスリリースを取得するハンドラー
// GET /press-releases/:id
func GetPressReleaseHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid ID")
		return
	}

	pool := db.GetDB()
	var pr model.PressRelease
	var contentStr string
	var createdAt time.Time
	var updatedAt time.Time

	err = pool.QueryRow(
		context.Background(),
		"SELECT id, title, content, created_at, updated_at FROM press_releases WHERE id = $1",
		id,
	).Scan(&pr.ID, &pr.Title, &contentStr, &createdAt, &updatedAt)

	if err == pgx.ErrNoRows {
		httputil.RespondWithError(w, http.StatusNotFound, "NOT_FOUND", "Press release not found")
		return
	} else if err != nil {
		log.Printf("GetPressReleaseHandler: query error id=%d err=%v", id, err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	pr.Content = contentStr
	pr.CreatedAt = httputil.FormatTimestamp(createdAt)
	pr.UpdatedAt = httputil.FormatTimestamp(updatedAt)

	// get assigned tags
	ctx := context.Background()
	rows, err := pool.Query(ctx, `
		SELECT t.name
		FROM tags t
		JOIN press_release_tags prt ON t.id = prt.tag_id
		WHERE prt.press_release_id = $1
		ORDER BY t.name
	`, id)
	if err != nil {
		log.Printf("GetPressReleaseHandler: tag query error id=%d err=%v", id, err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	defer rows.Close()
	var tagNames []string
	for rows.Next() {
		var tn string
		if err := rows.Scan(&tn); err != nil {
			log.Printf("GetPressReleaseHandler: tag scan error id=%d err=%v", id, err)
			continue
		}
		tagNames = append(tagNames, tn)
	}
	if err := rows.Err(); err != nil {
		log.Printf("GetPressReleaseHandler: tag rows error id=%d err=%v", id, err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	pr.Tags = tagNames

	httputil.RespondWithJSON(w, http.StatusOK, pr)
}

// SavePressReleaseHandler はプレスリリースを保存（更新）するハンドラー
// POST /press-releases/:id
func SavePressReleaseHandler(w http.ResponseWriter, r *http.Request) {
	const maxRequestBodyBytes = 1 << 20 // 1MB

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid ID")
		return
	}

	limitedBody := http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)
	body, err := io.ReadAll(limitedBody)
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			httputil.RespondWithError(w, http.StatusRequestEntityTooLarge, "BODY_TOO_LARGE", "Request body too large")
			return
		}

		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON")
		return
	}

	var payload interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON")
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
		httputil.RespondWithError(w, http.StatusBadRequest, "MISSING_REQUIRED_FIELDS", "Title and content are required")
		return
	}
	req := model.SavePressReleaseRequest{
		Title:   title,
		Content: content,
	}

	// --- 3-3: バックエンドバリデーション（タイトル100文字、本文500文字） ---
	if len([]rune(req.Title)) > model.TitleMaxChars {
		httputil.RespondWithError(w, http.StatusBadRequest, "TITLE_TOO_LONG", "Title must be 100 characters or less")
		return
	}

	bodyLen, err := tiptap.GetTextLengthFromJSON(req.Content)
	if err != nil {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_CONTENT_JSON", "Invalid content JSON")
		return
	}

	// 確認用：バックエンドで受け取った本文文字数をログに出す
	log.Printf("content length (getText-like): %d", bodyLen)

	if bodyLen > model.BodyMaxChars {
		httputil.RespondWithError(w, http.StatusBadRequest, "CONTENT_TOO_LONG", "Content must be 500 characters or less")
		return
	}
	// --- ここまで ---

	pool := db.GetDB()
	ctx := context.Background()

	var exists bool
	err = pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM press_releases WHERE id = $1)", id).Scan(&exists)
	if err != nil {
		log.Printf("SavePressReleaseHandler: existence check error id=%d err=%v", id, err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	if !exists {
		httputil.RespondWithError(w, http.StatusNotFound, "NOT_FOUND", "Press release not found")
		return
	}

	_, err = pool.Exec(
		ctx,
		`UPDATE press_releases
		 SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $3`,
		req.Title,
		req.Content,
		id,
	)

	if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	var pressRelease model.PressRelease
	var createdAt time.Time
	var updatedAt time.Time
	err = pool.QueryRow(
		ctx,
		"SELECT id, title, content, created_at, updated_at FROM press_releases WHERE id = $1",
		id,
	).Scan(&pressRelease.ID, &pressRelease.Title, &pressRelease.Content, &createdAt, &updatedAt)

	if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	pressRelease.CreatedAt = httputil.FormatTimestamp(createdAt)
	pressRelease.UpdatedAt = httputil.FormatTimestamp(updatedAt)

	// get assigned tags for the press release
	rows2, err := pool.Query(ctx, `
		SELECT t.name
		FROM tags t
		JOIN press_release_tags prt ON t.id = prt.tag_id
		WHERE prt.press_release_id = $1
		ORDER BY t.name
	`, id)
	if err != nil {
		log.Printf("SavePressReleaseHandler: tag query error id=%d err=%v", id, err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	defer rows2.Close()
	var tagNames2 []string
	for rows2.Next() {
		var tn string
		if err := rows2.Scan(&tn); err != nil {
			log.Printf("SavePressReleaseHandler: tag scan error id=%d err=%v", id, err)
			continue
		}
		tagNames2 = append(tagNames2, tn)
	}
	if err := rows2.Err(); err != nil {
		log.Printf("SavePressReleaseHandler: tag rows error id=%d err=%v", id, err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	pressRelease.Tags = tagNames2

	httputil.RespondWithJSON(w, http.StatusOK, pressRelease)
}
