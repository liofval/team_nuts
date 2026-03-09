# クイックスタートガイド

← [ドキュメント一覧に戻る](./README.md)

---

## 前提条件

- Docker & Docker Compose がインストール済み
- Node.js 18以上がインストール済み

---

## 手順1: バックエンド起動

```bash
cd webapp
docker compose up -d
```

PostgreSQL と Go APIサーバーが起動し、初期データがDBに自動挿入されます。

---

## 手順2: フロントエンド起動

```bash
cd webapp/frontend/react
npm install
npm run dev
```

ブラウザで `http://localhost:5173`（または `5174`）を開くと編集画面が表示されます。

---

## 手順3: 動作確認

```bash
# APIで ID=1 のプレスリリースを取得
curl http://localhost:8080/press-releases/1

# フロントエンドで編集・保存してみる
# → ブラウザでタイトルや本文を編集して「保存」ボタンをクリック
# → 再度 curl コマンドで取得すると更新内容が反映されている
```

---

## 停止方法

```bash
# バックエンド停止
docker compose down

# フロントエンド停止（ターミナルで）
Ctrl + C
```
