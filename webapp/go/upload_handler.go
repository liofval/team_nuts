package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const uploadsDir = "./uploads"

var allowedMimeTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
}

// UploadImageHandler は画像をアップロードするハンドラー
// POST /uploads
func UploadImageHandler(w http.ResponseWriter, r *http.Request) {
	const maxUploadSize = 10 << 20 // 10MB

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		respondWithError(w, http.StatusBadRequest, "FILE_TOO_LARGE", "File size exceeds 10MB")
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "MISSING_FILE", "Image file is required")
		return
	}
	defer file.Close()

	// MIMEタイプを検証
	buf := make([]byte, 512)
	if _, err := file.Read(buf); err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to read file")
		return
	}
	mimeType := http.DetectContentType(buf)
	ext, ok := allowedMimeTypes[mimeType]
	if !ok {
		respondWithError(w, http.StatusBadRequest, "INVALID_FILE_TYPE", "Only JPEG, PNG, GIF, WebP are allowed")
		return
	}

	// ファイル先頭に戻す
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	// ランダムなファイル名を生成
	randBytes := make([]byte, 16)
	if _, err := rand.Read(randBytes); err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	originalName := strings.TrimSuffix(filepath.Base(header.Filename), filepath.Ext(header.Filename))
	sanitized := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '_'
	}, originalName)
	if len(sanitized) > 32 {
		sanitized = sanitized[:32]
	}
	filename := fmt.Sprintf("%s_%s%s", sanitized, hex.EncodeToString(randBytes), ext)

	// アップロードディレクトリを作成
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	// ファイルを保存
	dst, err := os.Create(filepath.Join(uploadsDir, filename))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save file")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save file")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{
		"url": fmt.Sprintf("/uploads/%s", filename),
	})
}
