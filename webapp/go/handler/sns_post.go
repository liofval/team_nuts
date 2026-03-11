package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"press-release-editor/db"
	"press-release-editor/httputil"
	"press-release-editor/model"

	"github.com/go-chi/chi/v5"
	openai "github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
)

const snsGeneratePrompt = `あなたはSNSマーケティングの専門家です。
プレスリリースの内容を元に、XとInstagramに最適化された投稿文を生成してください。

# 入力
- タイトル: %s
- 本文: %s

# X（旧Twitter）向け
- 280文字以内（日本語）
- ニュース速報的な簡潔さ
- ハッシュタグ2〜3個
- URLは含めない（後から追加する想定）

# Instagram向け
- 500〜1000文字
- ストーリー性のある文章
- ハッシュタグ10〜15個
- 改行を適切に使って読みやすく

# 出力形式
以下のJSON形式のみを出力し、それ以外のテキストは絶対に含めないでください。
{"x":"X向けの投稿文","instagram":"Instagram向けの投稿文"}`

// GenerateSNSPostHandler はAIでSNS投稿文を生成する
// POST /api/press-releases/{id}/sns/generate
func GenerateSNSPostHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	pressReleaseID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || pressReleaseID <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid press release ID")
		return
	}

	var req model.GenerateSNSRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	if strings.TrimSpace(req.Content) == "" {
		httputil.RespondWithError(w, http.StatusBadRequest, "MISSING_REQUIRED_FIELDS", "content is required")
		return
	}

	// 本文を3000文字に制限
	contentRunes := []rune(req.Content)
	if len(contentRunes) > 3000 {
		contentRunes = contentRunes[:3000]
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		log.Printf("GenerateSNSPostHandler: OPENAI_API_KEY is not set")
		httputil.RespondWithError(w, http.StatusInternalServerError, "LLM_ERROR", "OpenAI API key is not configured")
		return
	}

	prompt := fmt.Sprintf(snsGeneratePrompt, req.Title, string(contentRunes))

	client := openai.NewClient(option.WithAPIKey(apiKey))
	completion, err := client.Chat.Completions.New(context.Background(), openai.ChatCompletionNewParams{
		Model: "gpt-4o-mini",
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.UserMessage(prompt),
		},
	})
	if err != nil {
		log.Printf("GenerateSNSPostHandler: OpenAI API error: %v", err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "LLM_ERROR", "Failed to call OpenAI API")
		return
	}

	if len(completion.Choices) == 0 {
		httputil.RespondWithError(w, http.StatusInternalServerError, "LLM_ERROR", "No response from OpenAI API")
		return
	}

	outputText := strings.TrimSpace(completion.Choices[0].Message.Content)

	// コードブロックマーカーを除去
	if strings.HasPrefix(outputText, "```json") {
		outputText = strings.TrimPrefix(outputText, "```json")
		outputText = strings.TrimSuffix(strings.TrimSpace(outputText), "```")
		outputText = strings.TrimSpace(outputText)
	} else if strings.HasPrefix(outputText, "```") {
		outputText = strings.TrimPrefix(outputText, "```")
		outputText = strings.TrimSuffix(strings.TrimSpace(outputText), "```")
		outputText = strings.TrimSpace(outputText)
	}

	var generated model.GenerateSNSResponse
	if err := json.Unmarshal([]byte(outputText), &generated); err != nil {
		log.Printf("GenerateSNSPostHandler: failed to parse LLM response: %v\noutput: %s", err, outputText)
		httputil.RespondWithError(w, http.StatusInternalServerError, "PARSE_ERROR", "Failed to parse LLM response")
		return
	}

	// DBに保存
	pool := db.GetDB()
	now := time.Now()
	var posts []model.SNSPost

	platforms := []struct {
		name    string
		content string
	}{
		{"x", generated.X},
		{"instagram", generated.Instagram},
	}

	for _, p := range platforms {
		charCount := utf8.RuneCountInString(p.content)
		var post model.SNSPost
		err := pool.QueryRow(
			context.Background(),
			`INSERT INTO sns_posts (press_release_id, platform, content, char_count, status, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, 'draft', $5, $5)
			 RETURNING id, press_release_id, platform, content, char_count, status, posted_at, created_at, updated_at`,
			pressReleaseID, p.name, p.content, charCount, now,
		).Scan(&post.ID, &post.PressReleaseID, &post.Platform, &post.Content, &post.CharCount, &post.Status, &post.PostedAt, &post.CreatedAt, &post.UpdatedAt)
		if err != nil {
			log.Printf("GenerateSNSPostHandler: DB insert error: %v", err)
			httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save SNS post")
			return
		}
		posts = append(posts, post)
	}

	httputil.RespondWithJSON(w, http.StatusCreated, posts)
}

// ListSNSPostsHandler はSNS投稿履歴を一覧取得する
// GET /api/press-releases/{id}/sns
func ListSNSPostsHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	pressReleaseID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || pressReleaseID <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid press release ID")
		return
	}

	pool := db.GetDB()
	rows, err := pool.Query(
		context.Background(),
		`SELECT id, press_release_id, platform, content, char_count, status, posted_at, created_at, updated_at
		 FROM sns_posts
		 WHERE press_release_id = $1
		 ORDER BY created_at DESC`,
		pressReleaseID,
	)
	if err != nil {
		log.Printf("ListSNSPostsHandler: query error: %v", err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	defer rows.Close()

	var posts []model.SNSPost
	for rows.Next() {
		var post model.SNSPost
		if err := rows.Scan(&post.ID, &post.PressReleaseID, &post.Platform, &post.Content, &post.CharCount, &post.Status, &post.PostedAt, &post.CreatedAt, &post.UpdatedAt); err != nil {
			log.Printf("ListSNSPostsHandler: scan error: %v", err)
			httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
			return
		}
		posts = append(posts, post)
	}

	if posts == nil {
		posts = []model.SNSPost{}
	}

	httputil.RespondWithJSON(w, http.StatusOK, posts)
}

// UpdateSNSPostHandler はSNS投稿文を編集する
// PUT /api/sns-posts/{postId}
func UpdateSNSPostHandler(w http.ResponseWriter, r *http.Request) {
	postIDStr := chi.URLParam(r, "postId")
	postID, err := strconv.ParseInt(postIDStr, 10, 64)
	if err != nil || postID <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid post ID")
		return
	}

	var req model.UpdateSNSPostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	charCount := utf8.RuneCountInString(req.Content)
	pool := db.GetDB()

	var post model.SNSPost
	err = pool.QueryRow(
		context.Background(),
		`UPDATE sns_posts SET content = $1, char_count = $2, updated_at = now()
		 WHERE id = $3
		 RETURNING id, press_release_id, platform, content, char_count, status, posted_at, created_at, updated_at`,
		req.Content, charCount, postID,
	).Scan(&post.ID, &post.PressReleaseID, &post.Platform, &post.Content, &post.CharCount, &post.Status, &post.PostedAt, &post.CreatedAt, &post.UpdatedAt)
	if err != nil {
		log.Printf("UpdateSNSPostHandler: update error postId=%d: %v", postID, err)
		httputil.RespondWithError(w, http.StatusNotFound, "NOT_FOUND", "SNS post not found")
		return
	}

	httputil.RespondWithJSON(w, http.StatusOK, post)
}

// PublishSNSPostHandler はSNS投稿をモック投稿する
// POST /api/sns-posts/{postId}/publish
func PublishSNSPostHandler(w http.ResponseWriter, r *http.Request) {
	postIDStr := chi.URLParam(r, "postId")
	postID, err := strconv.ParseInt(postIDStr, 10, 64)
	if err != nil || postID <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid post ID")
		return
	}

	pool := db.GetDB()

	// まず投稿データを取得
	var post model.SNSPost
	err = pool.QueryRow(
		context.Background(),
		`SELECT id, press_release_id, platform, content, char_count, status, posted_at, created_at, updated_at
		 FROM sns_posts WHERE id = $1`,
		postID,
	).Scan(&post.ID, &post.PressReleaseID, &post.Platform, &post.Content, &post.CharCount, &post.Status, &post.PostedAt, &post.CreatedAt, &post.UpdatedAt)
	if err != nil {
		httputil.RespondWithError(w, http.StatusNotFound, "NOT_FOUND", "SNS post not found")
		return
	}

	if post.Status == "posted" {
		httputil.RespondWithError(w, http.StatusConflict, "ALREADY_POSTED", "This post has already been published")
		return
	}

	// モック投稿（ログ出力のみ）
	log.Printf("[MOCK SNS] Platform=%s PressReleaseID=%d Content=%s", post.Platform, post.PressReleaseID, post.Content)

	// ステータスを更新
	now := time.Now()
	err = pool.QueryRow(
		context.Background(),
		`UPDATE sns_posts SET status = 'posted', posted_at = $1, updated_at = $1
		 WHERE id = $2
		 RETURNING id, press_release_id, platform, content, char_count, status, posted_at, created_at, updated_at`,
		now, postID,
	).Scan(&post.ID, &post.PressReleaseID, &post.Platform, &post.Content, &post.CharCount, &post.Status, &post.PostedAt, &post.CreatedAt, &post.UpdatedAt)
	if err != nil {
		log.Printf("PublishSNSPostHandler: update error postId=%d: %v", postID, err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update post status")
		return
	}

	httputil.RespondWithJSON(w, http.StatusOK, post)
}
