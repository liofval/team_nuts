package model

import "time"

// SNSPost はSNS投稿のデータ構造
type SNSPost struct {
	ID             int64      `json:"id"`
	PressReleaseID int64      `json:"press_release_id"`
	Platform       string     `json:"platform"`
	Content        string     `json:"content"`
	CharCount      int        `json:"char_count"`
	Status         string     `json:"status"`
	PostedAt       *time.Time `json:"posted_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// GenerateSNSRequest はAI要約生成リクエスト
type GenerateSNSRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"` // プレスリリース本文（プレーンテキスト）
}

// GenerateSNSResponse はAI要約生成レスポンス（LLM出力のパース用）
type GenerateSNSResponse struct {
	X         string `json:"x"`
	Instagram string `json:"instagram"`
}

// UpdateSNSPostRequest は投稿文の編集リクエスト
type UpdateSNSPostRequest struct {
	Content string `json:"content"`
}
