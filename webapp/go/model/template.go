package model

// Template はテンプレートのデータ構造
type Template struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// SaveTemplateRequest はテンプレート保存リクエストのデータ構造
type SaveTemplateRequest struct {
	Name    string `json:"name"`
	Title   string `json:"title"`
	Content string `json:"content"`
}
