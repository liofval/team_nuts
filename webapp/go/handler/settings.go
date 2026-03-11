package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"press-release-editor/db"
	"press-release-editor/httputil"
	"press-release-editor/model"
)

func maskKey(value string) string {
	runes := []rune(value)
	if len(runes) <= 4 {
		return strings.Repeat("*", len(runes))
	}
	return strings.Repeat("*", len(runes)-4) + string(runes[len(runes)-4:])
}

var settingsKeys = []string{"x_api_key", "x_api_secret", "x_access_token", "x_access_secret", "instagram_api_key"}

// GetSettingsHandler は設定を取得する
// GET /api/settings
func GetSettingsHandler(w http.ResponseWriter, r *http.Request) {
	pool := db.GetDB()
	ctx := context.Background()

	rows, err := pool.Query(ctx, `SELECT key, value FROM settings WHERE key = ANY($1)`, settingsKeys)
	if err != nil {
		log.Printf("GetSettingsHandler: query error: %v", err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	defer rows.Close()

	resp := model.SettingsResponse{}
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		masked := maskKey(value)
		switch key {
		case "x_api_key":
			resp.XAPIKey = masked
			resp.XAPIKeySet = true
		case "x_api_secret":
			resp.XAPISecret = masked
			resp.XAPISecretSet = true
		case "x_access_token":
			resp.XAccessToken = masked
			resp.XAccessTokenSet = true
		case "x_access_secret":
			resp.XAccessSecret = masked
			resp.XAccessSecretSet = true
		case "instagram_api_key":
			resp.InstagramAPIKey = masked
			resp.InstagramKeySet = true
		}
	}

	httputil.RespondWithJSON(w, http.StatusOK, resp)
}

// SaveSettingsHandler は設定を保存する
// PUT /api/settings
func SaveSettingsHandler(w http.ResponseWriter, r *http.Request) {
	var req model.SaveSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	pool := db.GetDB()
	ctx := context.Background()

	keys := []struct {
		name  string
		value string
	}{
		{"x_api_key", strings.TrimSpace(req.XAPIKey)},
		{"x_api_secret", strings.TrimSpace(req.XAPISecret)},
		{"x_access_token", strings.TrimSpace(req.XAccessToken)},
		{"x_access_secret", strings.TrimSpace(req.XAccessSecret)},
		{"instagram_api_key", strings.TrimSpace(req.InstagramAPIKey)},
	}

	for _, k := range keys {
		if k.value == "" {
			_, err := pool.Exec(ctx, `DELETE FROM settings WHERE key = $1`, k.name)
			if err != nil {
				log.Printf("SaveSettingsHandler: delete error key=%s: %v", k.name, err)
			}
		} else {
			_, err := pool.Exec(ctx,
				`INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, now())
				 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
				k.name, k.value,
			)
			if err != nil {
				log.Printf("SaveSettingsHandler: upsert error key=%s: %v", k.name, err)
				httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save settings")
				return
			}
		}
	}

	// 保存後の設定を返却
	GetSettingsHandler(w, r)
}
