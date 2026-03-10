package httputil

import (
	"encoding/json"
	"net/http"
	"time"
)

// ErrorResponse はエラーレスポンスのデータ構造
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// SuccessResponse は成功レスポンスのデータ構造
type SuccessResponse struct {
	Message string `json:"message"`
}

// RespondWithJSON はJSONレスポンスを返すヘルパー関数
func RespondWithJSON(w http.ResponseWriter, statusCode int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(payload)
}

// RespondWithError はエラーレスポンスを返すヘルパー関数
func RespondWithError(w http.ResponseWriter, statusCode int, code string, message string) {
	RespondWithJSON(w, statusCode, ErrorResponse{Code: code, Message: message})
}

// FormatTimestamp はタイムスタンプをフォーマットする
func FormatTimestamp(t time.Time) string {
	return t.Format("2006-01-02T15:04:05.000000")
}
