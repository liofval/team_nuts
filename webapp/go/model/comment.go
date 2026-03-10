package model

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
