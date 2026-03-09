# バックエンド（Go）・Docker の構成

← [ドキュメント一覧に戻る](./README.md)

---

## Go バックエンド構成

### main.go ─ エントリーポイント

起動時の処理フロー:

1. `GetDB()` でDB接続プールを初期化
2. Chi ルーターを初期化
3. ミドルウェアを設定（ログ出力・エラー復旧・CORS）
4. ルートを定義（GET/POST `/press-releases/{id}`）
5. ポート 8080 でサーバー起動

---

### handlers.go ─ リクエストハンドラー

#### GetPressReleaseHandler（GET）

```
1. URLパラメータの {id} を整数に変換・検証
2. DBに SELECT クエリを実行
3. 存在しない → 404 エラーを返す
4. 取得したデータをJSONで返す
```

#### SavePressReleaseHandler（POST）

```
1. リクエストボディのサイズチェック（最大 1MB）
2. JSONをパース
3. title と content の必須バリデーション
4. 指定IDのレコードが存在するか確認（なければ404）
5. UPDATE クエリを実行
6. 更新後のデータをSELECTして返す
```

---

### database.go ─ DB接続管理

**シングルトンパターン**でPostgreSQL接続プールを管理します。

```
GetDB() 関数:
  - 初回呼び出し時のみ接続プールを作成
  - 2回目以降はキャッシュ済みのプールを返す
  - 接続情報は環境変数から取得
```

使用する環境変数:

| 環境変数 | デフォルト値 |
|--------|------------|
| `DB_HOST` | postgresql |
| `DB_PORT` | 5432 |
| `DB_USER` | press_release |
| `DB_PASSWORD` | press_release |
| `DB_NAME` | press_release_db |

---

### 主要な依存ライブラリ

| ライブラリ | 用途 | バージョン |
|----------|------|----------|
| go-chi/chi | HTTPルーター | v5.2.5 |
| go-chi/cors | CORSミドルウェア | v1.2.2 |
| jackc/pgx | PostgreSQLドライバー | v5.8.0 |

---

## Docker 環境構成

### docker-compose.yml の構造

```yaml
services:
  postgresql:       # PostgreSQL 16
    ports: 5432
    volumes: sql/schema.sql を自動実行
    healthcheck: pg_isready で死活監視

  app:              # Go バックエンド
    build: ./go
    ports: 8080
    depends_on: postgresql が healthy になるまで待機
```

### コンテナの起動順序

```
docker compose up -d
       ↓
  postgresql 起動
       ↓
  ヘルスチェック通過（pg_isready）
       ↓
  app（Go）起動
       ↓
  http://localhost:8080 で利用可能
```
