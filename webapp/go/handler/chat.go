package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"press-release-editor/httputil"

	openai "github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
)

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Messages   []ChatMessage `json:"messages"`
	EditorBody string        `json:"editor_body"`
}

type ChatResponse struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

const systemPrompt = `あなたはPR TIMESのプレスリリース作成をサポートするAIアシスタントです。

# 役割
- プレスリリースの書き方についてアドバイスする
- タイトル、リード文、本文の改善提案を行う
- 文章の校正やチェックを手伝う
- プレスリリースに関する一般的な質問に答える

# ルール
- 回答は簡潔で実用的にしてください
- プレスリリースの文脈に沿ったアドバイスをしてください
- 日本語で回答してください
- ユーザーがエディタで作成中の本文が提供された場合、その内容を踏まえてアドバイスしてください`

// ChatHandler はOpenAI APIを使ってチャット応答を生成する
// POST /api/chat
func ChatHandler(w http.ResponseWriter, r *http.Request) {
	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if len(req.Messages) == 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_REQUEST", "At least one message is required")
		return
	}

	// システムプロンプト構築
	sysPrompt := systemPrompt
	if req.EditorBody != "" {
		body := req.EditorBody
		if len([]rune(body)) > 3000 {
			body = string([]rune(body)[:3000])
		}
		sysPrompt += fmt.Sprintf("\n\n# 現在のエディタ本文\n%s", body)
	}

	// OpenAI メッセージ配列を構築
	messages := []openai.ChatCompletionMessageParamUnion{
		openai.SystemMessage(sysPrompt),
	}
	for _, msg := range req.Messages {
		switch msg.Role {
		case "user":
			messages = append(messages, openai.UserMessage(msg.Content))
		case "assistant":
			messages = append(messages, openai.AssistantMessage(msg.Content))
		}
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	client := openai.NewClient(option.WithAPIKey(apiKey))

	completion, err := client.Chat.Completions.New(context.Background(), openai.ChatCompletionNewParams{
		Model:    "gpt-4o-mini",
		Messages: messages,
	})
	if err != nil {
		httputil.RespondWithError(w, http.StatusInternalServerError, "LLM_ERROR", "Failed to call OpenAI API")
		return
	}

	if len(completion.Choices) == 0 {
		httputil.RespondWithError(w, http.StatusInternalServerError, "LLM_ERROR", "No response from OpenAI API")
		return
	}

	resp := ChatResponse{
		Role:    "assistant",
		Content: completion.Choices[0].Message.Content,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
