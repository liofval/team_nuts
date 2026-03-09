package main

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

// respondWithJSON はJSONレスポンスを返すヘルパー関数
func respondWithJSON(w http.ResponseWriter, statusCode int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(payload)
}

// respondWithError はエラーレスポンスを返すヘルパー関数
func respondWithError(w http.ResponseWriter, statusCode int, code string, message string) {
	respondWithJSON(w, statusCode, ErrorResponse{Code: code, Message: message})
}

func formatTimestamp(t time.Time) string {
	return t.Format("2006-01-02T15:04:05.000000")
}
