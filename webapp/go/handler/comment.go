package handler

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	"press-release-editor/db"
	"press-release-editor/httputil"
	"press-release-editor/model"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

// ListCommentsHandler はプレスリリースに紐づくコメント一覧を取得
// GET /press-releases/{id}/comments
func ListCommentsHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	prID, err := strconv.Atoi(idStr)
	if err != nil || prID <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid ID")
		return
	}

	pool := db.GetDB()
	ctx := context.Background()

	// 全コメントを取得（親・返信含む）
	rows, err := pool.Query(ctx,
		`SELECT id, press_release_id, parent_id, comment_id, body, resolved, created_at, updated_at
		 FROM comments
		 WHERE press_release_id = $1
		 ORDER BY created_at ASC`,
		prID,
	)
	if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	defer rows.Close()

	allComments := []model.Comment{}
	for rows.Next() {
		var c model.Comment
		var parentID *int
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&c.ID, &c.PressReleaseID, &parentID, &c.CommentID, &c.Body, &c.Resolved, &createdAt, &updatedAt); err != nil {
			httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
			return
		}
		c.ParentID = parentID
		c.CreatedAt = httputil.FormatTimestamp(createdAt)
		c.UpdatedAt = httputil.FormatTimestamp(updatedAt)
		allComments = append(allComments, c)
	}

	// ツリー構造に変換: 親コメントに返信をネスト
	commentMap := make(map[int]*model.Comment)
	for i := range allComments {
		allComments[i].Replies = []model.Comment{}
		commentMap[allComments[i].ID] = &allComments[i]
	}

	var rootComments []*model.Comment
	for i := range allComments {
		c := &allComments[i]
		if c.ParentID == nil {
			rootComments = append(rootComments, c)
		} else if parent, ok := commentMap[*c.ParentID]; ok {
			parent.Replies = append(parent.Replies, *c)
		}
	}

	result := make([]model.Comment, 0, len(rootComments))
	for _, root := range rootComments {
		result = append(result, *root)
	}

	httputil.RespondWithJSON(w, http.StatusOK, result)
}

// CreateCommentHandler はコメントを新規作成
// POST /press-releases/{id}/comments
func CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	prID, err := strconv.Atoi(idStr)
	if err != nil || prID <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid ID")
		return
	}

	const maxBody = 1 << 20
	limitedBody := http.MaxBytesReader(w, r.Body, maxBody)
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

	var req model.CreateCommentRequest
	if err := json.Unmarshal(body, &req); err != nil {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON")
		return
	}

	if req.Body == "" {
		httputil.RespondWithError(w, http.StatusBadRequest, "MISSING_REQUIRED_FIELDS", "Body is required")
		return
	}
	if req.CommentID == "" {
		httputil.RespondWithError(w, http.StatusBadRequest, "MISSING_REQUIRED_FIELDS", "comment_id is required")
		return
	}

	pool := db.GetDB()
	ctx := context.Background()

	var c model.Comment
	var parentID *int
	var createdAt, updatedAt time.Time
	err = pool.QueryRow(ctx,
		`INSERT INTO comments (press_release_id, parent_id, comment_id, body)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, press_release_id, parent_id, comment_id, body, resolved, created_at, updated_at`,
		prID, req.ParentID, req.CommentID, req.Body,
	).Scan(&c.ID, &c.PressReleaseID, &parentID, &c.CommentID, &c.Body, &c.Resolved, &createdAt, &updatedAt)

	if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	c.ParentID = parentID
	c.CreatedAt = httputil.FormatTimestamp(createdAt)
	c.UpdatedAt = httputil.FormatTimestamp(updatedAt)

	httputil.RespondWithJSON(w, http.StatusCreated, c)
}

// ResolveCommentHandler はコメントを解決済みにする
// PUT /press-releases/{id}/comments/{commentId}/resolve
func ResolveCommentHandler(w http.ResponseWriter, r *http.Request) {
	commentIDStr := chi.URLParam(r, "commentId")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil || commentID <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid comment ID")
		return
	}

	pool := db.GetDB()
	ctx := context.Background()

	var c model.Comment
	var parentID *int
	var createdAt, updatedAt time.Time
	err = pool.QueryRow(ctx,
		`UPDATE comments SET resolved = TRUE, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1
		 RETURNING id, press_release_id, parent_id, comment_id, body, resolved, created_at, updated_at`,
		commentID,
	).Scan(&c.ID, &c.PressReleaseID, &parentID, &c.CommentID, &c.Body, &c.Resolved, &createdAt, &updatedAt)

	if err == pgx.ErrNoRows {
		httputil.RespondWithError(w, http.StatusNotFound, "NOT_FOUND", "Comment not found")
		return
	} else if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	c.ParentID = parentID
	c.CreatedAt = httputil.FormatTimestamp(createdAt)
	c.UpdatedAt = httputil.FormatTimestamp(updatedAt)

	httputil.RespondWithJSON(w, http.StatusOK, c)
}

// UnresolveCommentHandler はコメントの解決を取り消す
// PUT /press-releases/{id}/comments/{commentId}/unresolve
func UnresolveCommentHandler(w http.ResponseWriter, r *http.Request) {
	commentIDStr := chi.URLParam(r, "commentId")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil || commentID <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid comment ID")
		return
	}

	pool := db.GetDB()
	ctx := context.Background()

	var c model.Comment
	var parentID *int
	var createdAt, updatedAt time.Time
	err = pool.QueryRow(ctx,
		`UPDATE comments SET resolved = FALSE, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1
		 RETURNING id, press_release_id, parent_id, comment_id, body, resolved, created_at, updated_at`,
		commentID,
	).Scan(&c.ID, &c.PressReleaseID, &parentID, &c.CommentID, &c.Body, &c.Resolved, &createdAt, &updatedAt)

	if err == pgx.ErrNoRows {
		httputil.RespondWithError(w, http.StatusNotFound, "NOT_FOUND", "Comment not found")
		return
	} else if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	c.ParentID = parentID
	c.CreatedAt = httputil.FormatTimestamp(createdAt)
	c.UpdatedAt = httputil.FormatTimestamp(updatedAt)

	httputil.RespondWithJSON(w, http.StatusOK, c)
}

// DeleteCommentHandler はコメントを削除する
// DELETE /press-releases/{id}/comments/{commentId}
func DeleteCommentHandler(w http.ResponseWriter, r *http.Request) {
	commentIDStr := chi.URLParam(r, "commentId")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil || commentID <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid comment ID")
		return
	}

	pool := db.GetDB()
	ctx := context.Background()

	tag, err := pool.Exec(ctx, "DELETE FROM comments WHERE id = $1", commentID)
	if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	if tag.RowsAffected() == 0 {
		httputil.RespondWithError(w, http.StatusNotFound, "NOT_FOUND", "Comment not found")
		return
	}

	httputil.RespondWithJSON(w, http.StatusOK, httputil.SuccessResponse{Message: "Comment deleted"})
}
