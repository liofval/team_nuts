# プレスリリースエディター

TipTapベースのリッチテキストエディターで、プレスリリースの作成・編集・SNS投稿までを一気通貫で行えるWebアプリケーションです。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React + TypeScript + Vite |
| エディター | TipTap (ProseMirror) |
| バックエンドAPI | Go 1.25 (Chi router) |
| データベース | PostgreSQL 16 |
| AI連携 | OpenAI API (GPT-4o-mini) |
| SNS投稿 | X API v2 (OAuth 1.0a) |
| 画像ストレージ | AWS S3 (Presigned URL) |
| コンテナ | Docker Compose |

## 主な機能

- リッチテキストエディター（見出し・太字・画像・リンク等）
- DOCX インポート
- OGP プレビュー付きリンク埋め込み
- テンプレートからの記事作成
- コメント・レビュー機能
- タグ付け・類似記事レコメンド
- AIタイトル生成 / AIチャットアシスタント
- SNS下書き自動生成（X / Instagram）
- X (Twitter) への実投稿

## クイックスタート

### 1. 環境変数の設定

`webapp/.env` を作成し、以下を設定してください。

```bash
# OpenAI API Key（SNS下書き生成・AIチャット等に必要）
OPENAI_API_KEY=sk-your-openai-api-key

# AWS S3（画像アップロードに必要）
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=ap-southeast-2
AWS_S3_BUCKET=your-bucket-name
```

> X (Twitter) の認証情報はアプリの設定画面から入力します（`.env` には不要）。

### 2. Docker Compose で起動

```bash
cd webapp
docker compose up -d
```

3つのコンテナが起動します。

| コンテナ | ポート | 説明 |
|---------|--------|------|
| `press-release-frontend` | http://localhost:3000 | フロントエンド (nginx + React SPA) |
| `press-release-app` | http://localhost:8080 | バックエンドAPI (Go) |
| `press-release-db` | localhost:5432 | PostgreSQL |

ブラウザで http://localhost:3000 を開いてください。

### 3. 再ビルド

コードを変更した場合は、再ビルドしてください。

```bash
docker compose build && docker compose up -d
```

### 4. 停止

```bash
docker compose down
```

データは Docker Volume に永続化されます。完全にリセットするには:

```bash
docker compose down -v
```

## X (Twitter) 投稿の設定

1. [X Developer Portal](https://developer.x.com/) でアプリを作成し、以下の4つの認証情報を取得
   - API Key
   - API Key Secret
   - Access Token
   - Access Token Secret
2. アプリの左サイドバーで「設定」タブを開く
3. X認証情報の4つのフィールドに入力して保存
4. SNSタブで下書きを作成後、「Xに投稿する」ボタンで投稿

## API 一覧

### プレスリリース

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/press-releases` | 一覧取得 |
| POST | `/api/press-releases` | 新規作成 |
| GET | `/api/press-releases/:id` | 取得 |
| POST | `/api/press-releases/:id` | 更新 |

### テンプレート

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/templates` | 一覧取得 |
| POST | `/api/templates` | 作成 |
| GET | `/api/templates/:id` | 取得 |
| PUT | `/api/templates/:id` | 更新 |
| DELETE | `/api/templates/:id` | 削除 |

### SNS投稿

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/press-releases/:id/sns/generate` | AI下書き生成 |
| GET | `/api/press-releases/:id/sns` | 投稿一覧 |
| PUT | `/api/sns-posts/:postId` | 下書き編集 |
| POST | `/api/sns-posts/:postId/publish` | SNS投稿 |

### 設定

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/settings` | 設定取得 |
| PUT | `/api/settings` | 設定保存 |

### コメント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/press-releases/:id/comments` | コメント一覧 |
| POST | `/api/press-releases/:id/comments` | コメント作成 |
| PUT | `/api/press-releases/:id/comments/:commentId/resolve` | 解決済みにする |
| PUT | `/api/press-releases/:id/comments/:commentId/unresolve` | 未解決に戻す |
| DELETE | `/api/press-releases/:id/comments/:commentId` | 削除 |

### その他

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/uploads` | 画像アップロード |
| POST | `/api/s3/presign` | S3 Presigned URL 発行 |
| POST | `/api/import-docx` | DOCXインポート |
| GET | `/api/ogp` | OGP情報取得 |
| POST | `/api/generate-title` | AIタイトル生成 |
| POST | `/api/chat` | AIチャット |
| GET | `/api/v1/tags/suggest` | タグ候補取得 |
| GET | `/api/v1/search` | 検索 |
| GET | `/api/v1/recommend` | レコメンド |

## ディレクトリ構成

```
webapp/
├── docker-compose.yml
├── .env                          # 環境変数
├── sql/                          # DBマイグレーション
│   ├── 000_schema.sql
│   ├── 001_add_tags.sql
│   ├── 003_add_sns_posts.sql
│   └── 004_add_settings.sql
├── go/                           # バックエンド
│   ├── Dockerfile
│   ├── main.go                   # ルーター定義
│   ├── handler/                  # HTTPハンドラー
│   ├── model/                    # データモデル
│   ├── db/                       # DB接続
│   ├── httputil/                 # レスポンスヘルパー
│   ├── tiptap/                   # TipTap JSON処理
│   ├── imgutil/                  # 画像処理
│   └── docx/                     # DOCXパーサー
└── frontend/react/               # フロントエンド
    ├── Dockerfile
    ├── nginx.conf                # APIプロキシ設定
    └── src/
        ├── features/
        │   ├── settings/         # 設定（API Key管理）
        │   └── sns-post/         # SNS投稿機能
        ├── components/
        │   ├── editor/           # エディターコンポーネント
        │   ├── comment/          # コメント機能
        │   └── template/         # テンプレート機能
        └── extensions/           # TipTap拡張
```
