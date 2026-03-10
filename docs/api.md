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

---

## タグ関連 / 検索 API (追加)

フロントエンドのタグ補完や検索で利用する API のリクエスト例と期待するモック JSON レスポンスを示します。

### GET /v1/tags/suggest
タグ候補を取得します。`q` が空の場合は人気順トップを返します。

リクエスト例:
```bash
curl "http://localhost:8080/v1/tags/suggest?q=IT&limit=10"
```

レスポンス例 (q 指定時):
```json
{
  "items": [
    {"id": 12, "name": "IT", "slug": "it", "type": "tag", "count": 452},
    {"id": 34, "name": "IT業界", "slug": "it-gyoukai", "type": "tag", "count": 120},
    {"id": 56, "name": "ITトレンド", "slug": "it-trend", "type": "tag", "count": 78}
  ]
}
```

レスポンス例 (q 空時 - 人気順):
```json
{
  "items": [
    {"id": 12, "name": "IT", "slug": "it", "type": "tag", "count": 452},
    {"id": 78, "name": "AI", "slug": "ai", "type": "tag", "count": 398},
    {"id": 90, "name": "DX", "slug": "dx", "type": "tag", "count": 210}
  ]
}
```

### POST /v1/press_release/{id}/tags
記事にタグを割り当てます。存在しないタグは `create_missing=true` で作成できます。

リクエスト例:
```bash
curl -X POST http://localhost:8080/v1/press_release/1/tags \
  -H "Content-Type: application/json" \
  -d '{"tags":["IT","AI"], "create_missing": true}'
```

レスポンス例:
```json
{
  "status": "ok",
  "assigned": [
    {"id": 12, "name": "IT", "slug": "it", "type": "tag", "count": 453},
    {"id": 78, "name": "AI", "slug": "ai", "type": "tag", "count": 399}
  ]
}
```

### PUT /v1/press_release/{id}/tags/{tag_id}
タグ自体の編集（管理用）。

リクエスト例:
```bash
curl -X PUT http://localhost:8080/v1/press_release/1/tags/12 \
  -H "Content-Type: application/json" \
  -d '{"name":"情報技術","slug":"joho-gijutsu","type":"tag"}'
```

レスポンス例:
```json
{
  "status": "ok",
  "tag": {"id": 12, "name": "情報技術", "slug": "joho-gijutsu", "type": "tag", "count": 453}
}
```

### DELETE /v1/press_release/{id}/tags/{tag_id}
記事からタグを外します。

リクエスト例:
```bash
curl -X DELETE http://localhost:8080/v1/press_release/1/tags/12
```

レスポンス例:
```json
{ "status": "ok" }
```

### GET /v1/search
記事の検索を行います。`q`（全文検索）と `tags`（カンマ区切りスラグ）を組み合わせて利用できます。

リクエスト例:
```bash
curl "http://localhost:8080/v1/search?q=AI&tags=ai,it&page=1&per_page=10"
```

レスポンス例:
```json
{
  "total": 123,
  "page": 1,
  "per_page": 10,
  "items": [
    {
      "id": 1,
      "title": "〜新サービスが業界を変える〜",
      "main_image_url": "/uploads/abcdef.jpg",
      "excerpt": "プレスリリース本文の抜粋…",
      "published_at": "2026-03-10T12:34:56Z",
      "matched_tags": ["IT","AI"],
      "score": 2.34
    },
    {
      "id": 5,
      "title": "AIを活用した新プロダクト発表",
      "main_image_url": "/uploads/ghijkl.jpg",
      "excerpt": "本文の先頭〜",
      "published_at": "2026-02-20T08:00:00Z",
      "matched_tags": ["AI"],
      "score": 1.87
    }
  ]
}
```

### GET /api/v1/recommend
エディタ上でのリアルタイム推薦検索用API。`q`（キーワード）または `tags`（カンマ区切りスラグ）を受け取り、関連記事を配列で返します。

リクエスト例:
```bash
curl "http://localhost:8080/api/v1/recommend?q=AI&limit=8"
curl "http://localhost:8080/api/v1/recommend?tags=it,ai&limit=8"
```

レスポンス例（配列を直返し）:
```json
[
  {
    "id": 1,
    "title": "AIを活用した新プロダクト発表",
    "mainImageUrl": "/uploads/ghijkl.jpg",
    "excerpt": "本文の先頭〜",
    "publishedAt": "2026-02-20T08:00:00Z",
    "tags": ["AI","IT"],
    "score": 1.87
  },
  {
    "id": 12,
    "title": "IT業界の最新トレンドまとめ",
    "mainImageUrl": null,
    "excerpt": "最近の動向について〜",
    "publishedAt": "2026-01-15T09:30:00Z",
    "tags": ["IT"],
    "score": 1.2
  }
]
```

### GET /api/v1/press_releases/{id}/similar
指定記事に類似する記事を返します。まず同じタグを持つ記事を優先して返し、必要に応じて全文検索で補います。

リクエスト例:
```bash
curl "http://localhost:8080/api/v1/press_releases/1/similar?limit=8"
```

レスポンス例（配列を直返し）:
```json
[
  {
    "id": 5,
    "title": "AIを活用した新プロダクト発表",
    "mainImageUrl": "/uploads/ghijkl.jpg",
    "excerpt": "本文の先頭〜",
    "publishedAt": "2026-02-20T08:00:00Z",
    "tags": ["AI"],
    "score": 3
  },
  {
    "id": 9,
    "title": "データ分析で顧客獲得を加速",
    "mainImageUrl": null,
    "excerpt": "参考となる事例紹介〜",
    "publishedAt": "2025-12-10T12:00:00Z",
    "tags": ["DX","AI"],
    "score": 1.5
  }
]
```

