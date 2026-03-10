package model

// Tag はタグのデータ構造
type Tag struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	Type      string `json:"type"`
	Count     int    `json:"count,omitempty"`
	CreatedAt string `json:"created_at,omitempty"`
}

// AssignTagsRequest はタグ付けリクエスト
type AssignTagsRequest struct {
	Tags          []string `json:"tags"`
	CreateMissing bool     `json:"create_missing"`
}
