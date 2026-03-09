# プレスリリースエディター - ドキュメント

Hackathon 2026 Spring 向けに開発された**プレスリリースエディターアプリケーション**の解説ドキュメントです。
Web ブラウザ上でプレスリリースのタイトルと本文をリアルタイムで編集・保存できます。

---

## ドキュメント一覧

| ファイル | 内容 |
|--------|------|
| [getting-started.md](./getting-started.md) | **まずここから** - 環境構築と起動手順 |
| [architecture.md](./architecture.md) | 技術スタック・ディレクトリ構成 |
| [api.md](./api.md) | APIエンドポイント・DBスキーマ |
| [frontend.md](./frontend.md) | フロントエンド（React）の構成 |
| [backend.md](./backend.md) | バックエンド（Go）・Docker の構成 |
| [development-tips.md](./development-tips.md) | 開発時の注意点 |

## タスク詳細ドキュメント

課題ごとの実装解説は [tasks/](./tasks/) ディレクトリに格納しています。

| ファイル | 内容 |
|--------|------|
| [tasks/2-1_image-insert-from-url.md](./tasks/2-1_image-insert-from-url.md) | 2-1: URLから画像の追加（画像追加機能） |

---

## アーキテクチャ概要

```
ブラウザ（React）
    ↕ HTTP (port 5173)
Vite 開発サーバー
    ↕ HTTP (port 8080)
Go API サーバー（Docker）
    ↕ TCP (port 5432)
PostgreSQL（Docker）
```
