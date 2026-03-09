# APIエンドポイント・DBスキーマ

← [ドキュメント一覧に戻る](./README.md)

---

## APIエンドポイント

すべてのエンドポイントはポート `8080` で動作します（`http://localhost:8080`）。

### GET /press-releases/:id

指定IDのプレスリリースを取得します。

**リクエスト例:**
```bash
curl http://localhost:8080/press-releases/1
```

**レスポンス例（200 OK）:**
```json
{
  "id": 1,
  "title": "年収550万円以上で即内定！技術×ビジネス思考を磨く27・28卒向けハッカソン受付開始",
  "content": "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"プレスリリース本文...\"}]}]}",
  "created_at": "2026-02-13T06:14:04.732533",
  "updated_at": "2026-02-13T06:14:04.732533"
}
```

**エラーレスポンス（404 Not Found）:**
```json
{
  "code": "NOT_FOUND",
  "message": "Press release not found"
}
```

---

### POST /press-releases/:id

指定IDのプレスリリースを更新します（既存レコードの更新のみ、新規作成は不可）。

**リクエスト例:**
```bash
curl -X POST http://localhost:8080/press-releases/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新しいタイトル",
    "content": "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"新しい本文\"}]}]}"
  }'
```

**レスポンス例（200 OK）:**
```json
{
  "id": 1,
  "title": "新しいタイトル",
  "content": "...",
  "created_at": "2026-02-13T06:14:04.732533",
  "updated_at": "2026-02-16T15:30:00.123456"
}
```

**エラーレスポンス（400 Bad Request）:**
```json
{
  "code": "MISSING_REQUIRED_FIELDS",
  "message": "Title and content are required"
}
```

> **注意**: `content` フィールドは **TipTap JSON形式を文字列にシリアライズしたもの**です。JSONオブジェクトではなく文字列として送信してください。

---

### POST /uploads

ローカル画像ファイルをサーバーにアップロードします。アップロードした画像は `/uploads/{filename}` で配信されます。

**リクエスト例:**
```bash
curl -X POST http://localhost:8080/uploads \
  -F "image=@/path/to/image.png"
```

**レスポンス例（200 OK）:**
```json
{
  "url": "/uploads/my_image_a1b2c3d4e5f6.png"
}
```

**エラーレスポンス（400 Bad Request）:**
```json
{
  "code": "INVALID_FILE_TYPE",
  "message": "Only JPEG, PNG, GIF, WebP are allowed"
}
```

**制限事項:**
- 最大ファイルサイズ: 10MB
- 許可形式: JPEG / PNG / GIF / WebP
- ファイル種別はMIMEタイプで判定（拡張子ではない）

---

### GET /uploads/:filename

アップロード済みの画像ファイルを取得します（静的ファイル配信）。

```bash
curl http://localhost:8080/uploads/my_image_a1b2c3d4e5f6.png
```

---

## データベーススキーマ

### press_releases テーブル

```sql
CREATE TABLE press_releases (
    id         SERIAL PRIMARY KEY,
    title      VARCHAR(255) NOT NULL,
    content    TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

| カラム | 型 | 説明 |
|-------|-----|------|
| `id` | SERIAL | プライマリキー（自動採番） |
| `title` | VARCHAR(255) | プレスリリースのタイトル |
| `content` | TEXT | TipTap形式のJSON文字列 |
| `created_at` | TIMESTAMP | 作成日時 |
| `updated_at` | TIMESTAMP | 最終更新日時 |

Docker起動時に `sql/schema.sql` が自動実行され、ID=1の初期データが挿入されます。
