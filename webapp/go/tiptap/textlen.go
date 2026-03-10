package tiptap

import (
	"encoding/json"
	"strings"
)

// GetTextLengthFromJSON は、フロントの editor.getText().length に寄せた文字数カウントを行います。
// 方針：TipTap JSONを走査して text を連結し、ブロックノード境界で改行(\n)相当を挿入してカウントします。
func GetTextLengthFromJSON(contentJSON string) (int, error) {
	var v any
	if err := json.Unmarshal([]byte(contentJSON), &v); err != nil {
		return 0, err
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

	// 改行もカウントする（フロントの editor.getText().length に寄せる）
	out := b.String()
	return len([]rune(out)), nil
}
