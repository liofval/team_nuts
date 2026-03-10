package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"press-release-editor/httputil"

	openai "github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"github.com/openai/openai-go/v3/responses"
)

type GenerateTitleRequest struct {
	Body           string   `json:"body"`
	TargetAudience string   `json:"target_audience"`
	Tags           []string `json:"tags"`
}

type TitleCandidate struct {
	Title       string `json:"title"`
	Type        string `json:"type"`
	Description string `json:"description"`
}

type GenerateTitleResponse struct {
	Titles []TitleCandidate `json:"titles"`
}

// GenerateTitleHandler はOpenAI APIを使ってプレスリリースのタイトル案を5件生成する
// POST /api/generate-title
func GenerateTitleHandler(w http.ResponseWriter, r *http.Request) {
	const maxRequestBodyBytes = 1 << 20 // 1MB
	limitedBody := http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)

	var req GenerateTitleRequest
	if err := json.NewDecoder(limitedBody).Decode(&req); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			httputil.RespondWithError(w, http.StatusRequestEntityTooLarge, "BODY_TOO_LARGE", "Request body too large")
			return
		}
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if strings.TrimSpace(req.Body) == "" {
		httputil.RespondWithError(w, http.StatusBadRequest, "MISSING_REQUIRED_FIELDS", "body is required")
		return
	}
	if strings.TrimSpace(req.TargetAudience) == "" {
		httputil.RespondWithError(w, http.StatusBadRequest, "MISSING_REQUIRED_FIELDS", "target_audience is required")
		return
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		log.Printf("GenerateTitleHandler: OPENAI_API_KEY is not set")
		httputil.RespondWithError(w, http.StatusInternalServerError, "LLM_ERROR", "OpenAI API key is not configured")
		return
	}

	tagsStr := strings.Join(req.Tags, ", ")
	prompt := fmt.Sprintf(`# Role
あなたはPR TIMESで数多くのバズを生み出してきた、敏腕PRコンサルタントです。
中小企業の限られたリソースの中から、社会性やストーリー性を見出し、記者が思わずクリックしたくなる「ニュース価値」のあるタイトルを提案してください。

# Inputs
- 本文内容: %s
- キーワード/タグ: %s
- ターゲット: %s

# Constraints (タイトルの鉄則)
1. 文字数は30文字前後（最大40文字）に収める。
2. 【 】（隅付き括弧）を使って、プレスリリースの種類やベネフィットを強調する。
3. 抽象的な言葉（すごい、最高の、究極の）を避け、具体的な数字や「日本初」「業界初」などの事実を優先する。
4. 単なる宣伝ではなく「社会的な意義」や「背景にあるストーリー（開発者の想い）」を感じさせる。

# Output Style (以下の5つの切り口で提案してください)
1. 【王道・ニュース型】事実をストレートに伝え、信頼感を出す。
2. 【課題解決・共感型】ターゲットが抱える悩みに寄り添い、解決策を提示する。
3. 【ストーリー・背景型】なぜ作ったのか、苦労や想いを前面に出す（中小企業向け）。
4. 【トレンド・社会性型】今、社会で起きていることと結びつける。
5. 【インパクト・数字型】圧倒的な実績や数字で目を引く。

# Output Format
各タイトルの「狙い」も一言添えて出力してください。
以下のJSON形式のみを出力し、それ以外のテキストは絶対に含めないでください。
typeは必ず次の5種類のうちいずれかを使用してください：「王道・ニュース型」「課題解決型」「ストーリー型」「トレンド型」「インパクト型」。

{"titles":[{"title":"タイトル文","type":"王道・ニュース型","description":"狙いの説明"},{"title":"タイトル文","type":"課題解決型","description":"狙いの説明"},{"title":"タイトル文","type":"ストーリー型","description":"狙いの説明"},{"title":"タイトル文","type":"トレンド型","description":"狙いの説明"},{"title":"タイトル文","type":"インパクト型","description":"狙いの説明"}]}`, req.Body, tagsStr, req.TargetAudience)

	client := openai.NewClient(option.WithAPIKey(apiKey))

	resp, err := client.Responses.New(context.Background(), responses.ResponseNewParams{
		Model: "gpt-4o-mini",
		Input: responses.ResponseNewParamsInputUnion{OfString: openai.String(prompt)},
	})
	if err != nil {
		log.Printf("GenerateTitleHandler: OpenAI API error: %v", err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "LLM_ERROR", "Failed to call OpenAI API")
		return
	}

	outputText := strings.TrimSpace(resp.OutputText())

	// コードブロックマーカーが含まれる場合は除去する
	if strings.HasPrefix(outputText, "```json") {
		outputText = strings.TrimPrefix(outputText, "```json")
		outputText = strings.TrimSuffix(strings.TrimSpace(outputText), "```")
		outputText = strings.TrimSpace(outputText)
	} else if strings.HasPrefix(outputText, "```") {
		outputText = strings.TrimPrefix(outputText, "```")
		outputText = strings.TrimSuffix(strings.TrimSpace(outputText), "```")
		outputText = strings.TrimSpace(outputText)
	}

	var result GenerateTitleResponse
	if err := json.Unmarshal([]byte(outputText), &result); err != nil {
		log.Printf("GenerateTitleHandler: failed to parse LLM response: %v\noutput: %s", err, outputText)
		httputil.RespondWithError(w, http.StatusInternalServerError, "PARSE_ERROR", "Failed to parse LLM response")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
