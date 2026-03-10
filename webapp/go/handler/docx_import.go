package handler

import (
	"fmt"
	"io"
	"net/http"
	"strings"

	"press-release-editor/docx"
	"press-release-editor/httputil"
)

// ImportDocxHandler は .docx ファイルをアップロードしてTipTap JSON形式に変換するハンドラー
// POST /import-docx
func ImportDocxHandler(w http.ResponseWriter, r *http.Request) {
	const maxUploadSize = 20 << 20 // 20MB

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		httputil.RespondWithError(w, http.StatusBadRequest, "FILE_TOO_LARGE", "ファイルサイズが20MBを超えています")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		httputil.RespondWithError(w, http.StatusBadRequest, "MISSING_FILE", "ファイルが必要です")
		return
	}
	defer file.Close()

	if !strings.HasSuffix(strings.ToLower(header.Filename), ".docx") {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_FILE_TYPE", ".docx ファイルのみアップロード可能です")
		return
	}

	data, err := io.ReadAll(file)
	if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "ファイルの読み取りに失敗しました")
		return
	}

	result, err := docx.Parse(data, UploadsDir)
	if err != nil {
		httputil.RespondWithError(w, http.StatusBadRequest, "PARSE_ERROR", fmt.Sprintf("docxの解析に失敗しました: %v", err))
		return
	}

	httputil.RespondWithJSON(w, http.StatusOK, result)
}
