# 開発時の注意点

← [ドキュメント一覧に戻る](./README.md)

---

## CORS について

バックエンド（`main.go`）は開発用にCORSを全許可しています。

```go
AllowedOrigins: []string{"*"}
```

本番環境では必ず `AllowedOrigins` を制限してください。

---

## content フィールドの形式

`content` は **TipTap JSON を文字列にシリアライズしたもの**です。

```typescript
// フロントエンド送信時
const content = JSON.stringify(editor.getJSON());  // オブジェクト → 文字列
```

```typescript
// フロントエンド受信時
const parsed = JSON.parse(data.content);  // 文字列 → オブジェクト
```

DBには文字列のまま保存されます。JSONオブジェクトのまま送信するとサーバー側でエラーになるため注意してください。

---

## TipTap 拡張の追加

より多くの編集機能（リスト・太字・斜体など）を追加したい場合は、[frontend.md の「TipTap 拡張の追加方法」](./frontend.md#tiptap-拡張の追加方法)を参照してください。
