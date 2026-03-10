package main

import (
	"log"
	"net/http"
	"os"

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
	db := GetDB()
	defer db.Close()

	log.Println("Database connection established")

	// Chiルーターの初期化
	r := chi.NewRouter()

	// ミドルウェアの設定
	r.Use(middleware.Logger)    // ログ出力
	r.Use(middleware.Recoverer) // パニックからの復旧
	r.Use(middleware.RequestID) // リクエストIDの付与
	r.Use(middleware.RealIP)    // クライアントの実IPアドレスを取得

	// CORSミドルウェアの設定（開発用）
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// ルート定義
	r.Get("/press-releases/{id}", GetPressReleaseHandler)
	r.Post("/press-releases/{id}", SavePressReleaseHandler)
	r.Post("/uploads", UploadImageHandler)
	r.Post("/s3/presign", S3PresignHandler)
	r.Post("/import-docx", ImportDocxHandler)
	r.Get("/ogp", ogpHandler)

	// テンプレートAPI
	r.Get("/templates", ListTemplatesHandler)
	r.Post("/templates", CreateTemplateHandler)
	r.Get("/templates/{id}", GetTemplateHandler)
	r.Put("/templates/{id}", UpdateTemplateHandler)
	r.Delete("/templates/{id}", DeleteTemplateHandler)

	// コメントAPI
	r.Get("/press-releases/{id}/comments", ListCommentsHandler)
	r.Post("/press-releases/{id}/comments", CreateCommentHandler)
	r.Put("/press-releases/{id}/comments/{commentId}/resolve", ResolveCommentHandler)
	r.Put("/press-releases/{id}/comments/{commentId}/unresolve", UnresolveCommentHandler)
	r.Delete("/press-releases/{id}/comments/{commentId}", DeleteCommentHandler)

	// アップロード済み画像の静的ファイル配信
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadsDir))))

	// サーバー起動
	port := ":8080"
	log.Printf("Starting server on %s", port)
	if err := http.ListenAndServe(port, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
