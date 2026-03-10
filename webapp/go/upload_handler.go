package main

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"log"
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
}

// UploadImageHandler は画像をアップロードするハンドラー
// POST /uploads
func UploadImageHandler(w http.ResponseWriter, r *http.Request) {
	const maxUploadSize = 5 << 20 // 5MB

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		respondWithError(w, http.StatusBadRequest, "FILE_TOO_LARGE", "ファイルサイズが5MBを超えています")
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "MISSING_FILE", "Image file is required")
		return
	}
	defer file.Close()

	log.Printf("UploadImageHandler: received multipart upload field name=%s filename=%s", header.Filename, header.Filename)

	// MIMEタイプを検証
	buf := make([]byte, 512)
	if _, err := file.Read(buf); err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to read file")
		return
	}
	mimeType := http.DetectContentType(buf)
	ext, ok := allowedMimeTypes[mimeType]
	if !ok {
		respondWithError(w, http.StatusBadRequest, "INVALID_FILE_TYPE", "アップロード可能な形式はJPEG、PNG、GIFのみです")
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

	// リサイズ処理（長辺600px超の場合）
	resized, err := resizeImage(file, mimeType)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to process image")
		return
	}

	// ファイルを保存
	dst, err := os.Create(filepath.Join(uploadsDir, filename))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save file")
		return
	}
	defer dst.Close()

	if resized != nil {
		if _, err := io.Copy(dst, bytes.NewReader(resized)); err != nil {
			respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save file")
			return
		}
	} else {
		// リサイズ不要の場合はファイル先頭に戻して元データを保存
		if _, err := file.Seek(0, io.SeekStart); err != nil {
			respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
			return
		}
		if _, err := io.Copy(dst, file); err != nil {
			respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save file")
			return
		}
	}

	objectPath := fmt.Sprintf("/uploads/%s", filename)
	log.Printf("UploadImageHandler: saved file to %s", objectPath)
	respondWithJSON(w, http.StatusOK, map[string]string{
		"url": objectPath,
	})
}
