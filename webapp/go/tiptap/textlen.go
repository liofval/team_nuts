package tiptap

import (
	"encoding/json"
	"strings"
)

// GetTextFromJSON は TipTap JSON からプレーンテキストを抽出します。
func GetTextFromJSON(contentJSON string) (string, error) {
	var v any
	if err := json.Unmarshal([]byte(contentJSON), &v); err != nil {
		return "", err
	}

	var b strings.Builder

	var walk func(node any, parentType string)
	var nodeType func(node map[string]any) string

	nodeType = func(m map[string]any) string {
		if t, ok := m["type"].(string); ok {
			return t
		}
		return ""
	}

	// ブロック境界で改行を入れたいノード
	isBlockBoundary := func(t string) bool {
		switch t {
		case "paragraph", "heading", "blockquote", "codeBlock":
			return true
		case "listItem":
			return true
		default:
			return false
		}
	}

	walk = func(node any, parent string) {
		switch x := node.(type) {
		case map[string]any:
			t := nodeType(x)

			// text node
			if t == "text" {
				if txt, ok := x["text"].(string); ok {
					b.WriteString(txt)
				}
				return
			}

			// 子を走査
			if c, ok := x["content"]; ok {
				walk(c, t)
			} else {
				for _, val := range x {
					walk(val, t)
				}
			}

			// ブロックノードの終端で改行を追加（フロントのgetTextに寄せる）
			if isBlockBoundary(t) {
				s := b.String()
				if s != "" && !strings.HasSuffix(s, "\n") {
					b.WriteString("\n")
				}
			}

		case []any:
			for _, val := range x {
				walk(val, parent)
			}
		default:
		}
	}

	walk(v, "")
	return b.String(), nil
}

// GetTextLengthFromJSON は、フロントの editor.getText().length に寄せた文字数カウントを行います。
func GetTextLengthFromJSON(contentJSON string) (int, error) {
	text, err := GetTextFromJSON(contentJSON)
	if err != nil {
		return 0, err
	}
	return len([]rune(text)), nil
}
