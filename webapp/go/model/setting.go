package model

// SettingsResponse は設定のレスポンス（APIキーはマスク済み）
type SettingsResponse struct {
	XAPIKey         string `json:"x_api_key"`
	XAPIKeySet      bool   `json:"x_api_key_set"`
	XAPISecret      string `json:"x_api_secret"`
	XAPISecretSet   bool   `json:"x_api_secret_set"`
	XAccessToken    string `json:"x_access_token"`
	XAccessTokenSet bool   `json:"x_access_token_set"`
	XAccessSecret   string `json:"x_access_secret"`
	XAccessSecretSet bool  `json:"x_access_secret_set"`
	InstagramAPIKey string `json:"instagram_api_key"`
	InstagramKeySet bool   `json:"instagram_api_key_set"`
}

// SaveSettingsRequest は設定の保存リクエスト
type SaveSettingsRequest struct {
	XAPIKey         string `json:"x_api_key"`
	XAPISecret      string `json:"x_api_secret"`
	XAccessToken    string `json:"x_access_token"`
	XAccessSecret   string `json:"x_access_secret"`
	InstagramAPIKey string `json:"instagram_api_key"`
}
