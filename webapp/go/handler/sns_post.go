package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
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

	"github.com/dghubble/oauth1"
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

// GenerateSNSPosts はOpenAI APIを使ってSNS下書きを生成し、DBに保存する共有関数
func GenerateSNSPosts(ctx context.Context, pressReleaseID int64, title, plainText string) ([]model.SNSPost, error) {
	contentRunes := []rune(plainText)
	if len(contentRunes) > 3000 {
		contentRunes = contentRunes[:3000]
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("OPENAI_API_KEY is not set")
	}

	prompt := fmt.Sprintf(snsGeneratePrompt, title, string(contentRunes))

	client := openai.NewClient(option.WithAPIKey(apiKey))
	completion, err := client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Model: "gpt-4o-mini",
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.UserMessage(prompt),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("OpenAI API error: %w", err)
	}

	if len(completion.Choices) == 0 {
		return nil, fmt.Errorf("no response from OpenAI API")
	}

	outputText := strings.TrimSpace(completion.Choices[0].Message.Content)

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
		return nil, fmt.Errorf("failed to parse LLM response: %w", err)
	}

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
			ctx,
			`INSERT INTO sns_posts (press_release_id, platform, content, char_count, status, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, 'draft', $5, $5)
			 RETURNING id, press_release_id, platform, content, char_count, status, posted_at, created_at, updated_at`,
			pressReleaseID, p.name, p.content, charCount, now,
		).Scan(&post.ID, &post.PressReleaseID, &post.Platform, &post.Content, &post.CharCount, &post.Status, &post.PostedAt, &post.CreatedAt, &post.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("DB insert error: %w", err)
		}
		posts = append(posts, post)
	}

	return posts, nil
}

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

	posts, err := GenerateSNSPosts(r.Context(), pressReleaseID, req.Title, req.Content)
	if err != nil {
		log.Printf("GenerateSNSPostHandler: %v", err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "LLM_ERROR", "Failed to generate SNS posts")
		return
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

// getSettingValue はDBから設定値を取得する
func getSettingValue(ctx context.Context, key string) (string, error) {
	pool := db.GetDB()
	var value string
	err := pool.QueryRow(ctx, `SELECT value FROM settings WHERE key = $1`, key).Scan(&value)
	return value, err
}

// publishToX はX API v2でツイートを投稿する
func publishToX(ctx context.Context, content string) error {
	apiKey, err := getSettingValue(ctx, "x_api_key")
	if err != nil {
		return fmt.Errorf("X API Key が設定されていません")
	}
	apiSecret, err := getSettingValue(ctx, "x_api_secret")
	if err != nil {
		return fmt.Errorf("X API Secret が設定されていません")
	}
	accessToken, err := getSettingValue(ctx, "x_access_token")
	if err != nil {
		return fmt.Errorf("X Access Token が設定されていません")
	}
	accessSecret, err := getSettingValue(ctx, "x_access_secret")
	if err != nil {
		return fmt.Errorf("X Access Token Secret が設定されていません")
	}

	config := oauth1.NewConfig(apiKey, apiSecret)
	token := oauth1.NewToken(accessToken, accessSecret)
	httpClient := config.Client(oauth1.NoContext, token)

	body := map[string]string{"text": content}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal request body: %w", err)
	}

	resp, err := httpClient.Post("https://api.twitter.com/2/tweets", "application/json", bytes.NewReader(jsonBody))
	if err != nil {
		return fmt.Errorf("X API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("X API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// PublishSNSPostHandler はSNS投稿を実際に投稿する
// POST /api/sns-posts/{postId}/publish
func PublishSNSPostHandler(w http.ResponseWriter, r *http.Request) {
	postIDStr := chi.URLParam(r, "postId")
	postID, err := strconv.ParseInt(postIDStr, 10, 64)
	if err != nil || postID <= 0 {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_ID", "Invalid post ID")
		return
	}

	pool := db.GetDB()
	ctx := context.Background()

	// まず投稿データを取得
	var post model.SNSPost
	err = pool.QueryRow(
		ctx,
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

	// プラットフォーム別の投稿処理
	switch post.Platform {
	case "x":
		if err := publishToX(ctx, post.Content); err != nil {
			log.Printf("PublishSNSPostHandler: X API error postId=%d: %v", postID, err)
			// ステータスをfailedに更新
			pool.Exec(ctx, `UPDATE sns_posts SET status = 'failed', updated_at = now() WHERE id = $1`, postID)
			httputil.RespondWithError(w, http.StatusBadGateway, "PUBLISH_FAILED", err.Error())
			return
		}
	case "instagram":
		// Instagram投稿は将来対応（現状はモック）
		log.Printf("[MOCK SNS] Platform=instagram PressReleaseID=%d Content=%s", post.PressReleaseID, post.Content)
	default:
		httputil.RespondWithError(w, http.StatusBadRequest, "UNSUPPORTED_PLATFORM", "Unsupported platform")
		return
	}

	// ステータスを更新
	now := time.Now()
	err = pool.QueryRow(
		ctx,
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
