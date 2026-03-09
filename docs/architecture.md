# 技術スタック・ディレクトリ構成

← [ドキュメント一覧に戻る](./README.md)

---

## 技術スタック

### バックエンド

| 層 | 技術 | バージョン |
|----|------|----------|
| APIサーバー | Go + Chi フレームワーク | Go 1.25 / Chi v5.2.5 |
| DBドライバー | pgx (PostgreSQL driver) | v5.8.0 |
| CORS対応 | go-chi/cors | v1.2.2 |
| データベース | PostgreSQL | 16 |

### フロントエンド（React版）

| 層 | 技術 | バージョン |
|----|------|----------|
| フレームワーク | React | 19.2.0 |
| 言語 | TypeScript | 5.9.3 |
| ビルドツール | Vite | 7.3.1 |
| リッチエディタ | TipTap | 3.20.0 |
| 画像挿入拡張 | @tiptap/extension-image | 3.20.1 |
| データ取得 | TanStack React Query | 5.90.21 |

---

## ディレクトリ構成

```
team_nuts/
├── README.md                        # プロジェクト全体の説明
├── CLAUDE.md                        # Git ワークフロー・命名規則ガイド（Git管理外）
├── docs/                            # ドキュメント（このディレクトリ）
└── webapp/
    ├── README.md                    # バックエンド実装の詳細説明
    ├── docker-compose.yml           # Docker マルチコンテナ設定
    ├── openapi.yml                  # API 仕様書（OpenAPI 3.0形式）
    ├── sql/
    │   └── schema.sql               # PostgreSQL データベーススキーマ・初期データ
    ├── go/                          # Go バックエンド実装
    │   ├── main.go                  # エントリーポイント・ルーター設定
    │   ├── handlers.go              # HTTPリクエストハンドラー
    │   ├── database.go              # DB接続・プール管理
    │   ├── go.mod / go.sum          # Goモジュール依存管理
    │   └── Dockerfile               # Goアプリのコンテナイメージ定義
    └── frontend/react/              # React フロントエンド
        ├── package.json             # npmパッケージ依存管理
        ├── vite.config.ts           # Viteビルド設定
        ├── tsconfig.json            # TypeScript設定
        ├── index.html               # HTMLエントリーポイント
        └── src/
            ├── main.tsx             # Reactアプリ起動
            ├── App.tsx              # メインコンポーネント（全ロジック）
            ├── App.css              # コンポーネントスタイル
            └── index.css            # グローバルスタイル
```

### 各ディレクトリの役割

| ディレクトリ | 説明 |
|------------|------|
| `webapp/go/` | Goで実装されたAPIサーバー |
| `webapp/frontend/react/` | Reactで実装されたフロントエンド |
| `webapp/sql/` | DBスキーマと初期データ（Docker起動時に自動実行） |
