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

	// 自動下書き生成: APIキーが設定済みかつ未生成の場合のみ
	go func() {
		autoCtx := context.Background()
		pool := db.GetDB()

		var keyCount int
		if err := pool.QueryRow(autoCtx,
			`SELECT COUNT(*) FROM settings WHERE key IN ('x_api_key', 'instagram_api_key') AND value != ''`,
		).Scan(&keyCount); err != nil || keyCount == 0 {
			return
		}

		var draftCount int
		if err := pool.QueryRow(autoCtx,
			`SELECT COUNT(*) FROM sns_posts WHERE press_release_id = $1`, id,
		).Scan(&draftCount); err != nil || draftCount > 0 {
			return
		}

		plainText, err := tiptap.GetTextFromJSON(req.Content)
		if err != nil || len([]rune(plainText)) < 50 {
			return
		}

		if _, err := GenerateSNSPosts(autoCtx, int64(id), req.Title, plainText); err != nil {
			log.Printf("auto-draft: error for press_release_id=%d: %v", id, err)
		} else {
			log.Printf("auto-draft: generated SNS drafts for press_release_id=%d", id)
		}
	}()

	httputil.RespondWithJSON(w, http.StatusOK, pressRelease)
}

// ListPressReleasesHandler はプレスリリース一覧を取得するハンドラー
// GET /api/press-releases
func ListPressReleasesHandler(w http.ResponseWriter, r *http.Request) {
	pool := db.GetDB()
	ctx := context.Background()

	rows, err := pool.Query(ctx, `
		SELECT id, title, created_at, updated_at
		FROM press_releases
		ORDER BY updated_at DESC
	`)
	if err != nil {
		log.Printf("ListPressReleasesHandler: query error err=%v", err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	defer rows.Close()

	summaries := make([]model.PressReleaseSummary, 0)
	for rows.Next() {
		var s model.PressReleaseSummary
		var createdAt time.Time
		var updatedAt time.Time
		if err := rows.Scan(&s.ID, &s.Title, &createdAt, &updatedAt); err != nil {
			log.Printf("ListPressReleasesHandler: scan error err=%v", err)
			httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
			return
		}
		s.CreatedAt = httputil.FormatTimestamp(createdAt)
		s.UpdatedAt = httputil.FormatTimestamp(updatedAt)
		summaries = append(summaries, s)
	}

	if err := rows.Err(); err != nil {
		log.Printf("ListPressReleasesHandler: rows error err=%v", err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	httputil.RespondWithJSON(w, http.StatusOK, summaries)
}

// CreatePressReleaseHandler はプレスリリースを新規作成するハンドラー
// POST /api/press-releases
func CreatePressReleaseHandler(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_REQUEST", "Failed to read request body")
		return
	}
	defer r.Body.Close()

	var req model.CreatePressReleaseRequest
	if len(body) > 0 {
		if err := json.Unmarshal(body, &req); err != nil {
			httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON")
			return
		}
	}

	if req.Title == "" {
		req.Title = "新しいプレスリリース"
	}
	if req.Content == "" {
		req.Content = `{"type":"doc","content":[{"type":"paragraph"}]}`
	}

	pool := db.GetDB()
	ctx := context.Background()

	var pr model.PressRelease
	var createdAt time.Time
	var updatedAt time.Time
	err = pool.QueryRow(
		ctx,
		`INSERT INTO press_releases (title, content) VALUES ($1, $2)
		 RETURNING id, title, content, created_at, updated_at`,
		req.Title,
		req.Content,
	).Scan(&pr.ID, &pr.Title, &pr.Content, &createdAt, &updatedAt)
	if err != nil {
		log.Printf("CreatePressReleaseHandler: insert error err=%v", err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	pr.CreatedAt = httputil.FormatTimestamp(createdAt)
	pr.UpdatedAt = httputil.FormatTimestamp(updatedAt)
	pr.Tags = []string{}

	httputil.RespondWithJSON(w, http.StatusCreated, pr)
}
