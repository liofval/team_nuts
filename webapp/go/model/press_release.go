package model

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

const (
	TitleMaxChars = 100
	BodyMaxChars  = 500
)
