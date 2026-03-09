package main

import (
	"archive/zip"
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// ImportDocxHandler は .docx ファイルをアップロードしてTipTap JSON形式に変換するハンドラー
// POST /import-docx
func ImportDocxHandler(w http.ResponseWriter, r *http.Request) {
	const maxUploadSize = 20 << 20 // 20MB

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		respondWithError(w, http.StatusBadRequest, "FILE_TOO_LARGE", "ファイルサイズが20MBを超えています")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "MISSING_FILE", "ファイルが必要です")
		return
	}
	defer file.Close()

	if !strings.HasSuffix(strings.ToLower(header.Filename), ".docx") {
		respondWithError(w, http.StatusBadRequest, "INVALID_FILE_TYPE", ".docx ファイルのみアップロード可能です")
		return
	}

	data, err := io.ReadAll(file)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "ファイルの読み取りに失敗しました")
		return
	}

	result, err := parseDocx(data)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "PARSE_ERROR", fmt.Sprintf("docxの解析に失敗しました: %v", err))
		return
	}

	respondWithJSON(w, http.StatusOK, result)
}

type docxImportResult struct {
	Title   string `json:"title"`
	Content string `json:"content"` // TipTap JSON string
}

// parseDocx は .docx バイトデータを解析し、タイトルと本文のTipTap JSONを返す
func parseDocx(data []byte) (*docxImportResult, error) {
	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("ZIP解析エラー: %w", err)
	}

	// リレーション（画像参照）を取得
	rels := parseRelationships(reader)

	// 画像ファイルを抽出・保存
	imageURLs, err := extractImages(reader, rels)
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

	return &docxImportResult{
		Title:   title,
		Content: string(contentJSON),
	}, nil
}

// --- Relationships ---

type relationship struct {
	ID     string `xml:"Id,attr"`
	Target string `xml:"Target,attr"`
}

type relationships struct {
	Rels []relationship `xml:"Relationship"`
}

func parseRelationships(reader *zip.Reader) map[string]string {
	result := make(map[string]string)
	for _, f := range reader.File {
		if f.Name == "word/_rels/document.xml.rels" {
			rc, err := f.Open()
			if err != nil {
				continue
			}
			data, err := io.ReadAll(rc)
			rc.Close()
			if err != nil {
				continue
			}
			var rels relationships
			if err := xml.Unmarshal(data, &rels); err != nil {
				continue
			}
			for _, rel := range rels.Rels {
				result[rel.ID] = rel.Target
			}
		}
	}
	return result
}

// --- Image Extraction ---

func extractImages(reader *zip.Reader, rels map[string]string) (map[string]string, error) {
	imageURLs := make(map[string]string) // relID -> URL

	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return nil, err
	}

	for relID, target := range rels {
		// 画像ファイルのパスを解決
		var imgPath string
		if strings.HasPrefix(target, "/") {
			imgPath = target[1:]
		} else {
			imgPath = "word/" + target
		}

		// 画像MIMEタイプの判定
		ext := strings.ToLower(filepath.Ext(imgPath))
		if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".gif" {
			continue
		}

		// ZIPから画像を取得
		var imgFile *zip.File
		for _, f := range reader.File {
			if f.Name == imgPath {
				imgFile = f
				break
			}
		}
		if imgFile == nil {
			continue
		}

		rc, err := imgFile.Open()
		if err != nil {
			continue
		}
		imgData, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			continue
		}

		// ランダムなファイル名で保存
		randBytes := make([]byte, 16)
		if _, err := rand.Read(randBytes); err != nil {
			continue
		}
		filename := fmt.Sprintf("docx_%s%s", hex.EncodeToString(randBytes), ext)
		dstPath := filepath.Join(uploadsDir, filename)

		if err := os.WriteFile(dstPath, imgData, 0644); err != nil {
			continue
		}

		imageURLs[relID] = fmt.Sprintf("/uploads/%s", filename)
	}

	return imageURLs, nil
}

// --- Numbering (list detection) ---

type numInfo struct {
	// numID -> abstractNumID
	numToAbstract map[string]string
	// abstractNumID -> numFmt ("bullet" or "decimal" etc.)
	abstractFmt map[string]string
}

func parseNumbering(reader *zip.Reader) *numInfo {
	info := &numInfo{
		numToAbstract: make(map[string]string),
		abstractFmt:   make(map[string]string),
	}

	for _, f := range reader.File {
		if f.Name == "word/numbering.xml" {
			rc, err := f.Open()
			if err != nil {
				return info
			}
			data, err := io.ReadAll(rc)
			rc.Close()
			if err != nil {
				return info
			}

			// Simple XML structure parsing
			type lvl struct {
				Ilvl   string `xml:"ilvl,attr"`
				NumFmt struct {
					Val string `xml:"val,attr"`
				} `xml:"numFmt"`
			}
			type abstractNum struct {
				AbstractNumID string `xml:"abstractNumId,attr"`
				Lvls          []lvl  `xml:"lvl"`
			}
			type num struct {
				NumID          string `xml:"numId,attr"`
				AbstractNumRef struct {
					Val string `xml:"val,attr"`
				} `xml:"abstractNumIdRef"`
			}
			type numbering struct {
				AbstractNums []abstractNum `xml:"abstractNum"`
				Nums         []num         `xml:"num"`
			}

			var n numbering
			if err := xml.Unmarshal(data, &n); err != nil {
				return info
			}

			for _, an := range n.AbstractNums {
				for _, l := range an.Lvls {
					if l.Ilvl == "0" {
						info.abstractFmt[an.AbstractNumID] = l.NumFmt.Val
					}
				}
			}
			for _, nu := range n.Nums {
				info.numToAbstract[nu.NumID] = nu.AbstractNumRef.Val
			}
		}
	}
	return info
}

func (n *numInfo) listType(numID string) string {
	if n == nil {
		return ""
	}
	absID, ok := n.numToAbstract[numID]
	if !ok {
		return "bulletList"
	}
	fmt, ok := n.abstractFmt[absID]
	if !ok {
		return "bulletList"
	}
	if fmt == "bullet" {
		return "bulletList"
	}
	return "orderedList"
}

// --- Document XML Parsing ---

// convertDocumentToTiptap は document.xml を解析して TipTap JSON に変換する
func convertDocumentToTiptap(docData []byte, imageURLs map[string]string, numInfo *numInfo) (string, map[string]any, error) {
	decoder := xml.NewDecoder(bytes.NewReader(docData))

	var paragraphs []parsedParagraph
	var currentPara *parsedParagraph

	type stateStack struct {
		inParagraph bool
		inRun       bool
		bold        bool
		italic      bool
		underline   bool
		inDrawing   bool
		inBlip      bool
		blipEmbed   string
		styleVal    string
		numID       string
		collecting  bool
	}

	state := stateStack{}
	var textBuf strings.Builder

	for {
		tok, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", nil, err
		}

		switch t := tok.(type) {
		case xml.StartElement:
			local := t.Name.Local
			switch local {
			case "p": // w:p
				currentPara = &parsedParagraph{}
				state.inParagraph = true
				state.styleVal = ""
				state.numID = ""
			case "pStyle": // w:pStyle
				if state.inParagraph {
					for _, attr := range t.Attr {
						if attr.Name.Local == "val" {
							state.styleVal = attr.Value
						}
					}
				}
			case "numId": // w:numId
				if state.inParagraph {
					for _, attr := range t.Attr {
						if attr.Name.Local == "val" && attr.Value != "0" {
							state.numID = attr.Value
						}
					}
				}
			case "r": // w:r
				state.inRun = true
				state.bold = false
				state.italic = false
				state.underline = false
			case "b": // w:b (bold)
				if state.inRun {
					// w:b without val="0" means bold
					val := getXMLAttr(t, "val")
					if val != "0" && val != "false" {
						state.bold = true
					}
				}
			case "i": // w:i (italic)
				if state.inRun {
					val := getXMLAttr(t, "val")
					if val != "0" && val != "false" {
						state.italic = true
					}
				}
			case "u": // w:u (underline)
				if state.inRun {
					val := getXMLAttr(t, "val")
					if val != "none" && val != "" {
						state.underline = true
					}
				}
			case "t": // w:t
				if state.inRun {
					state.collecting = true
					textBuf.Reset()
				}
			case "drawing": // w:drawing
				state.inDrawing = true
			case "blip": // a:blip
				if state.inDrawing {
					for _, attr := range t.Attr {
						if attr.Name.Local == "embed" {
							state.blipEmbed = attr.Value
						}
					}
				}
			}

		case xml.CharData:
			if state.collecting {
				textBuf.Write(t)
			}

		case xml.EndElement:
			local := t.Name.Local
			switch local {
			case "t":
				if state.collecting && currentPara != nil {
					text := textBuf.String()
					if text != "" {
						run := parsedRun{
							Text:      text,
							Bold:      state.bold,
							Italic:    state.italic,
							Underline: state.underline,
						}
						currentPara.Runs = append(currentPara.Runs, run)
					}
					state.collecting = false
				}
			case "r":
				state.inRun = false
				state.bold = false
				state.italic = false
				state.underline = false
			case "drawing":
				if state.blipEmbed != "" && currentPara != nil {
					if url, ok := imageURLs[state.blipEmbed]; ok {
						currentPara.ImageURL = url
					}
				}
				state.inDrawing = false
				state.blipEmbed = ""
			case "p":
				if currentPara != nil {
					currentPara.Style = state.styleVal
					currentPara.NumID = state.numID
					paragraphs = append(paragraphs, *currentPara)
				}
				state.inParagraph = false
				currentPara = nil
			}
		}
	}

	// タイトル: 最初のHeading1か最初の段落のテキスト
	title := ""
	titleIdx := -1
	for i, p := range paragraphs {
		if isHeading1Style(p.Style) {
			title = p.plainText()
			titleIdx = i
			break
		}
	}
	if title == "" && len(paragraphs) > 0 {
		title = paragraphs[0].plainText()
		titleIdx = 0
	}

	// 本文: タイトル以外の段落をTipTap JSONに変換
	tiptapContent := buildTiptapContent(paragraphs, titleIdx, numInfo)

	doc := map[string]any{
		"type":    "doc",
		"content": tiptapContent,
	}

	return title, doc, nil
}

type parsedRun struct {
	Text      string
	Bold      bool
	Italic    bool
	Underline bool
}

type parsedParagraph struct {
	Runs     []parsedRun
	Style    string
	NumID    string
	ImageURL string
}

func (p parsedParagraph) plainText() string {
	var b strings.Builder
	for _, r := range p.Runs {
		b.WriteString(r.Text)
	}
	return b.String()
}

func isHeading1Style(style string) bool {
	s := strings.ToLower(style)
	return s == "heading1" || s == "1" || s == "title"
}

func headingLevel(style string) int {
	s := strings.ToLower(style)
	switch {
	case strings.Contains(s, "heading1") || s == "1":
		return 1
	case strings.Contains(s, "heading2") || s == "2":
		return 2
	case strings.Contains(s, "heading3") || s == "3":
		return 3
	case strings.Contains(s, "heading4") || s == "4":
		return 4
	default:
		return 0
	}
}

func getXMLAttr(el xml.StartElement, name string) string {
	for _, attr := range el.Attr {
		if attr.Name.Local == name {
			return attr.Value
		}
	}
	return ""
}

func buildTiptapContent(paragraphs []parsedParagraph, titleIdx int, numInfo *numInfo) []any {
	var content []any

	// リスト連続管理用
	type listGroup struct {
		listType string // "bulletList" or "orderedList"
		items    []parsedParagraph
	}

	var currentList *listGroup

	flushList := func() {
		if currentList == nil {
			return
		}
		listItems := make([]any, 0, len(currentList.items))
		for _, item := range currentList.items {
			listItems = append(listItems, map[string]any{
				"type":    "listItem",
				"content": []any{paragraphToTiptap(item)},
			})
		}
		content = append(content, map[string]any{
			"type":    currentList.listType,
			"content": listItems,
		})
		currentList = nil
	}

	for i, p := range paragraphs {
		if i == titleIdx {
			continue
		}

		// 画像がある場合
		if p.ImageURL != "" {
			flushList()
			content = append(content, map[string]any{
				"type": "image",
				"attrs": map[string]any{
					"src": p.ImageURL,
				},
			})
			// 画像と同じ段落にテキストがあれば段落も追加
			if p.plainText() != "" {
				content = append(content, paragraphToTiptap(p))
			}
			continue
		}

		// リスト判定
		if p.NumID != "" {
			lt := numInfo.listType(p.NumID)
			if currentList != nil && currentList.listType == lt {
				currentList.items = append(currentList.items, p)
			} else {
				flushList()
				currentList = &listGroup{listType: lt, items: []parsedParagraph{p}}
			}
			continue
		}

		flushList()

		// 見出し判定
		level := headingLevel(p.Style)
		if level > 0 {
			node := map[string]any{
				"type": "heading",
				"attrs": map[string]any{
					"level": level,
				},
			}
			runs := runsToTiptap(p.Runs)
			if len(runs) > 0 {
				node["content"] = runs
			}
			content = append(content, node)
			continue
		}

		// 通常の段落
		content = append(content, paragraphToTiptap(p))
	}

	flushList()

	// 空の場合はデフォルトの段落を追加
	if len(content) == 0 {
		content = append(content, map[string]any{
			"type": "paragraph",
		})
	}

	return content
}

func paragraphToTiptap(p parsedParagraph) map[string]any {
	node := map[string]any{
		"type": "paragraph",
	}
	runs := runsToTiptap(p.Runs)
	if len(runs) > 0 {
		node["content"] = runs
	}
	return node
}

func runsToTiptap(runs []parsedRun) []any {
	var result []any
	for _, r := range runs {
		if r.Text == "" {
			continue
		}
		textNode := map[string]any{
			"type": "text",
			"text": r.Text,
		}
		var marks []any
		if r.Bold {
			marks = append(marks, map[string]any{"type": "bold"})
		}
		if r.Italic {
			marks = append(marks, map[string]any{"type": "italic"})
		}
		if r.Underline {
			marks = append(marks, map[string]any{"type": "underline"})
		}
		if len(marks) > 0 {
			textNode["marks"] = marks
		}
		result = append(result, textNode)
	}
	return result
}
