# hackathon2026-spring-press-release-editor

Hackathon 2026 Spring 向けに開発されたプレスリリースエディターアプリケーションです。
参加者向けの手順はこの README と `webapp/README.md` に集約しています。

https://www.loom.com/share/49e68cd476064515b92af462c08c2084

## クイックスタート

### 1. バックエンド（Docker）を起動

```bash
cd webapp
docker compose up -d
```

### 2. フロントエンドを1つ選んで起動

React 版:

```bash
cd webapp/frontend/react
npm install
npm run dev
```

Vue 版:

```bash
cd webapp/frontend/vue
npm install
npm run dev
```

Next.js 版:

```bash
cd webapp/nextjs
npm install
npm run dev
```

## 主な機能

- プレスリリースの作成・編集・保存
- リッチテキストエディター（TipTap）
- 画像アップロード・リンクカード（OGP取得）
- テンプレート管理
- コメント機能（スレッド・解決）
- Wordファイル（.docx）インポート
- **執筆ワークフロー**: 記事執筆初心者向けのステップバイステップガイド
  1. キーワード選択（#新製品, #サービス開始, #提携, #受賞, #イベント, #採用, #決算）
  2. キーワードに応じたテンプレート適用
  3. AIタイトル生成
  4. 確認・保存

## プロジェクト構成

- **データベース**: PostgreSQL 16
- **バックエンド実装**（デフォルト: PHP）
  - ✅ PHP 8.5（Slim Framework 4）
  - ✅ Python 3.14（FastAPI）
  - ✅ Go 1.25（Chi + pgx）
  - ✅ Node.js（Hono）
- **フロントエンド**
  - ✅ React + Vite
  - ✅ Vue + Vite
  - ✅ Next.js

## 詳細情報

バックエンドAPI仕様・実装切り替え手順は以下を参照してください。

- [webapp/README.md](./webapp/README.md)
