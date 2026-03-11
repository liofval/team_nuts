package model

// SettingsResponse は設定のレスポンス（APIキーはマスク済み）
type SettingsResponse struct {
	XAPIKey          string `json:"x_api_key"`
	XAPIKeySet       bool   `json:"x_api_key_set"`
	InstagramAPIKey  string `json:"instagram_api_key"`
	InstagramKeySet  bool   `json:"instagram_api_key_set"`
}

// SaveSettingsRequest は設定の保存リクエスト
type SaveSettingsRequest struct {
	XAPIKey         string `json:"x_api_key"`
	InstagramAPIKey string `json:"instagram_api_key"`
}
