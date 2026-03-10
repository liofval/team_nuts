package docx

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
)

// ImportResult は .docx のインポート結果
type ImportResult struct {
	Title   string `json:"title"`
	Content string `json:"content"` // TipTap JSON string
}

// Parse は .docx バイトデータを解析し、タイトルと本文のTipTap JSONを返す
func Parse(data []byte, uploadsDir string) (*ImportResult, error) {
	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("ZIP解析エラー: %w", err)
	}

	// リレーション（画像参照）を取得
	rels := parseRelationships(reader)

	// 画像ファイルを抽出・保存
	imageURLs, err := extractImages(reader, rels, uploadsDir)
	if err != nil {
		return nil, fmt.Errorf("画像抽出エラー: %w", err)
	}

	// numbering.xml を解析（リスト判定用）
	numInfo := parseNumbering(reader)

	// document.xml を解析
	var docFile *zip.File
	for _, f := range reader.File {
		if f.Name == "word/document.xml" {
			docFile = f
			break
		}
	}
	if docFile == nil {
		return nil, fmt.Errorf("document.xml が見つかりません")
	}

	docReader, err := docFile.Open()
	if err != nil {
		return nil, err
	}
	defer docReader.Close()

	docData, err := io.ReadAll(docReader)
	if err != nil {
		return nil, err
	}

	title, content, err := convertDocumentToTiptap(docData, imageURLs, numInfo)
	if err != nil {
		return nil, err
	}

	contentJSON, err := json.Marshal(content)
	if err != nil {
		return nil, err
	}

	return &ImportResult{
		Title:   title,
		Content: string(contentJSON),
	}, nil
}
