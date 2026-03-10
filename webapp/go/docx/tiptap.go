package docx

import (
	"bytes"
	"encoding/xml"
	"io"
	"strings"
)

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
