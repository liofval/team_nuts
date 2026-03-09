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

// Comment はコメントのデータ構造
type Comment struct {
	ID             int       `json:"id"`
	PressReleaseID int       `json:"press_release_id"`
	ParentID       *int      `json:"parent_id"`
	CommentID      string    `json:"comment_id"`
	Body           string    `json:"body"`
	Resolved       bool      `json:"resolved"`
	CreatedAt      string    `json:"created_at"`
	UpdatedAt      string    `json:"updated_at"`
	Replies        []Comment `json:"replies,omitempty"`
}

// CreateCommentRequest はコメント作成リクエスト
type CreateCommentRequest struct {
	ParentID  *int   `json:"parent_id"`
	CommentID string `json:"comment_id"`
	Body      string `json:"body"`
}

// ListCommentsHandler はプレスリリースに紐づくコメント一覧を取得
// GET /press-releases/{id}/comments
func ListCommentsHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	prID, err := strconv.Atoi(idStr)
	if err != nil || prID <= 0 {
		respondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid ID")
		return
	}

	db := GetDB()
	ctx := context.Background()

	// 全コメントを取得（親・返信含む）
	rows, err := db.Query(ctx,
		`SELECT id, press_release_id, parent_id, comment_id, body, resolved, created_at, updated_at
		 FROM comments
		 WHERE press_release_id = $1
		 ORDER BY created_at ASC`,
		prID,
	)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	defer rows.Close()

	allComments := []Comment{}
	for rows.Next() {
		var c Comment
		var parentID *int
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&c.ID, &c.PressReleaseID, &parentID, &c.CommentID, &c.Body, &c.Resolved, &createdAt, &updatedAt); err != nil {
			respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
			return
		}
		c.ParentID = parentID
		c.CreatedAt = formatTimestamp(createdAt)
		c.UpdatedAt = formatTimestamp(updatedAt)
		allComments = append(allComments, c)
	}

	// ツリー構造に変換: 親コメントに返信をネスト
	commentMap := make(map[int]*Comment)
	var rootComments []Comment

	for i := range allComments {
		c := allComments[i]
		c.Replies = []Comment{}
		commentMap[c.ID] = &c
	}

	for i := range allComments {
		c := commentMap[allComments[i].ID]
		if c.ParentID == nil {
			rootComments = append(rootComments, *c)
		} else {
			if parent, ok := commentMap[*c.ParentID]; ok {
				parent.Replies = append(parent.Replies, *c)
			}
		}
	}

	// 親のRepliesを更新（ポインタ経由の更新を反映）
	result := make([]Comment, 0, len(rootComments))
	for _, root := range rootComments {
		if updated, ok := commentMap[root.ID]; ok {
			result = append(result, *updated)
		}
	}

	respondWithJSON(w, http.StatusOK, result)
}

// CreateCommentHandler はコメントを新規作成
// POST /press-releases/{id}/comments
func CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	prID, err := strconv.Atoi(idStr)
	if err != nil || prID <= 0 {
		respondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid ID")
		return
	}

	const maxBody = 1 << 20
	limitedBody := http.MaxBytesReader(w, r.Body, maxBody)
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

	var req CreateCommentRequest
	if err := json.Unmarshal(body, &req); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON")
		return
	}

	if req.Body == "" {
		respondWithError(w, http.StatusBadRequest, "MISSING_REQUIRED_FIELDS", "Body is required")
		return
	}
	if req.CommentID == "" {
		respondWithError(w, http.StatusBadRequest, "MISSING_REQUIRED_FIELDS", "comment_id is required")
		return
	}

	db := GetDB()
	ctx := context.Background()

	var c Comment
	var parentID *int
	var createdAt, updatedAt time.Time
	err = db.QueryRow(ctx,
		`INSERT INTO comments (press_release_id, parent_id, comment_id, body)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, press_release_id, parent_id, comment_id, body, resolved, created_at, updated_at`,
		prID, req.ParentID, req.CommentID, req.Body,
	).Scan(&c.ID, &c.PressReleaseID, &parentID, &c.CommentID, &c.Body, &c.Resolved, &createdAt, &updatedAt)

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	c.ParentID = parentID
	c.CreatedAt = formatTimestamp(createdAt)
	c.UpdatedAt = formatTimestamp(updatedAt)

	respondWithJSON(w, http.StatusCreated, c)
}

// ResolveCommentHandler はコメントを解決済みにする
// PUT /press-releases/{id}/comments/{commentId}/resolve
func ResolveCommentHandler(w http.ResponseWriter, r *http.Request) {
	commentIDStr := chi.URLParam(r, "commentId")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil || commentID <= 0 {
		respondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid comment ID")
		return
	}

	db := GetDB()
	ctx := context.Background()

	var c Comment
	var parentID *int
	var createdAt, updatedAt time.Time
	err = db.QueryRow(ctx,
		`UPDATE comments SET resolved = TRUE, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1
		 RETURNING id, press_release_id, parent_id, comment_id, body, resolved, created_at, updated_at`,
		commentID,
	).Scan(&c.ID, &c.PressReleaseID, &parentID, &c.CommentID, &c.Body, &c.Resolved, &createdAt, &updatedAt)

	if err == pgx.ErrNoRows {
		respondWithError(w, http.StatusNotFound, "NOT_FOUND", "Comment not found")
		return
	} else if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	c.ParentID = parentID
	c.CreatedAt = formatTimestamp(createdAt)
	c.UpdatedAt = formatTimestamp(updatedAt)

	respondWithJSON(w, http.StatusOK, c)
}

// UnresolveCommentHandler はコメントの解決を取り消す
// PUT /press-releases/{id}/comments/{commentId}/unresolve
func UnresolveCommentHandler(w http.ResponseWriter, r *http.Request) {
	commentIDStr := chi.URLParam(r, "commentId")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil || commentID <= 0 {
		respondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid comment ID")
		return
	}

	db := GetDB()
	ctx := context.Background()

	var c Comment
	var parentID *int
	var createdAt, updatedAt time.Time
	err = db.QueryRow(ctx,
		`UPDATE comments SET resolved = FALSE, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1
		 RETURNING id, press_release_id, parent_id, comment_id, body, resolved, created_at, updated_at`,
		commentID,
	).Scan(&c.ID, &c.PressReleaseID, &parentID, &c.CommentID, &c.Body, &c.Resolved, &createdAt, &updatedAt)

	if err == pgx.ErrNoRows {
		respondWithError(w, http.StatusNotFound, "NOT_FOUND", "Comment not found")
		return
	} else if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	c.ParentID = parentID
	c.CreatedAt = formatTimestamp(createdAt)
	c.UpdatedAt = formatTimestamp(updatedAt)

	respondWithJSON(w, http.StatusOK, c)
}

// DeleteCommentHandler はコメントを削除する
// DELETE /press-releases/{id}/comments/{commentId}
func DeleteCommentHandler(w http.ResponseWriter, r *http.Request) {
	commentIDStr := chi.URLParam(r, "commentId")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil || commentID <= 0 {
		respondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid comment ID")
		return
	}

	db := GetDB()
	ctx := context.Background()

	tag, err := db.Exec(ctx, "DELETE FROM comments WHERE id = $1", commentID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	if tag.RowsAffected() == 0 {
		respondWithError(w, http.StatusNotFound, "NOT_FOUND", "Comment not found")
		return
	}

	respondWithJSON(w, http.StatusOK, SuccessResponse{Message: "Comment deleted"})
}
