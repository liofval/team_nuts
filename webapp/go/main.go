package main

import (
	"log"
	"net/http"
	"os"

	"press-release-editor/db"
	"press-release-editor/handler"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

func main() {
	// .env をロード（開発環境用）。見つからなくても処理は継続
	if err := godotenv.Load(".env"); err != nil {
		log.Println(".env not loaded, proceeding with environment variables:", err)
	}

	// 起動時の簡易デバッグ出力（機密情報は出力しない）
	log.Printf("DB env: DB_HOST=%s DB_NAME=%s", os.Getenv("DB_HOST"), os.Getenv("DB_NAME"))

	// データベース接続の初期化
	pool := db.GetDB()
	defer pool.Close()

	log.Println("Database connection established")

	// Chiルーターの初期化
	r := chi.NewRouter()

	// ミドルウェアの設定
	r.Use(middleware.Logger)    // ログ出力
	r.Use(middleware.Recoverer) // パニックからの復旧
	r.Use(middleware.RequestID) // リクエストIDの付与
	r.Use(middleware.RealIP)    // クライアントの実IPアドレスを取得

	// CORSミドルウェアの設定（開発用）
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Header.Get("Access-Control-Request-Private-Network") == "true" {
				w.Header().Set("Access-Control-Allow-Private-Network", "true")
			}
			next.ServeHTTP(w, r)
		})
	})

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://13.211.211.117:3000", "http://13.211.211.117", "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization", "Access-Control-Request-Private-Network"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// ルート定義
	r.Get("/api/press-releases", handler.ListPressReleasesHandler)
	r.Post("/api/press-releases", handler.CreatePressReleaseHandler)
	r.Get("/api/press-releases/{id}", handler.GetPressReleaseHandler)
	r.Post("/api/press-releases/{id}", handler.SavePressReleaseHandler)

	// Tags & Search API
	r.Get("/api/v1/tags/suggest", handler.SuggestTagsHandler)
	r.Post("/api/v1/press_release/{id}/tags", handler.AssignTagsHandler)
	r.Put("/api/v1/press_release/{id}/tags/{tag_id}", handler.UpdateTagHandler)
	r.Delete("/api/v1/press_release/{id}/tags/{tag_id}", handler.DeleteTagAssignmentHandler)
	r.Get("/api/v1/search", handler.SearchHandler)
	r.Get("/api/v1/recommend", handler.RecommendHandler)
	r.Get("/api/v1/press_releases/{id}/similar", handler.SimilarPressReleasesHandler)
	r.Post("/api/uploads", handler.UploadImageHandler)
	r.Post("/api/s3/presign", handler.S3PresignHandler)
	r.Post("/api/import-docx", handler.ImportDocxHandler)
	r.Get("/api/ogp", handler.OgpHandler)

	// タイトル生成API
	r.Post("/api/generate-title", handler.GenerateTitleHandler)

	// チャットAPI
	r.Post("/api/chat", handler.ChatHandler)

	// テンプレートAPI
	r.Get("/api/templates", handler.ListTemplatesHandler)
	r.Post("/api/templates", handler.CreateTemplateHandler)
	r.Get("/api/templates/{id}", handler.GetTemplateHandler)
	r.Put("/api/templates/{id}", handler.UpdateTemplateHandler)
	r.Delete("/api/templates/{id}", handler.DeleteTemplateHandler)

	// SNS投稿API
	r.Post("/api/press-releases/{id}/sns/generate", handler.GenerateSNSPostHandler)
	r.Get("/api/press-releases/{id}/sns", handler.ListSNSPostsHandler)
	r.Put("/api/sns-posts/{postId}", handler.UpdateSNSPostHandler)
	r.Post("/api/sns-posts/{postId}/publish", handler.PublishSNSPostHandler)

	// コメントAPI
	r.Get("/api/press-releases/{id}/comments", handler.ListCommentsHandler)
	r.Post("/api/press-releases/{id}/comments", handler.CreateCommentHandler)
	r.Put("/api/press-releases/{id}/comments/{commentId}/resolve", handler.ResolveCommentHandler)
	r.Put("/api/press-releases/{id}/comments/{commentId}/unresolve", handler.UnresolveCommentHandler)
	r.Delete("/api/press-releases/{id}/comments/{commentId}", handler.DeleteCommentHandler)

	// アップロード済み画像の静的ファイル配信
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir(handler.UploadsDir))))
	r.Handle("/api/uploads/*", http.StripPrefix("/api/uploads/", http.FileServer(http.Dir(handler.UploadsDir))))

	// サーバー起動
	port := ":8080"
	log.Printf("Starting server on %s", port)
	if err := http.ListenAndServe(port, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
