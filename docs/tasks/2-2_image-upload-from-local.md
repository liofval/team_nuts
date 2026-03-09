# 2-2: ローカル画像のアップロード（画像アップロード機能）

← [ドキュメント一覧に戻る](../README.md)

---

## 概要

ローカルの画像ファイルを選択してサーバーにアップロードし、エディタ本文に挿入できる機能を追加しました。
アップロードされた画像はサーバーに保存されるため、**ページをリロードしても表示され続けます**。

---

## 変更ファイル

| ファイル | 変更内容 |
|--------|--------|
| `webapp/go/handlers.go` | `UploadImageHandler` を追加・import 追加 |
| `webapp/go/main.go` | `/uploads` ルートと静的ファイル配信を追加 |
| `webapp/docker-compose.yml` | `uploads_data` ボリュームを追加 |
| `webapp/frontend/react/src/App.tsx` | `useUploadImageMutation` フック・ファイル選択UIを追加 |
| `webapp/frontend/react/src/App.css` | アップロードボタンのスタイル追加 |

---

## 実装内容

### 1. Go: アップロードエンドポイント（handlers.go）

```go
func UploadImageHandler(w http.ResponseWriter, r *http.Request) {
    // 1. リクエストサイズを 10MB に制限
    // 2. multipart/form-data から "image" フィールドを取得
    // 3. 先頭512バイトでMIMEタイプを判定（JPEG/PNG/GIF/WebP のみ許可）
    // 4. 元ファイル名をサニタイズ + 16バイト乱数でユニークなファイル名を生成
    // 5. ./uploads/ に保存
    // 6. { "url": "/uploads/{filename}" } を返す
}
```

**ファイル名の生成例:**
```
元ファイル名: my photo.png
→ サニタイズ: my_photo
→ 乱数(hex): a1b2c3d4e5f6...
→ 最終ファイル名: my_photo_a1b2c3d4e5f6.png
```

---

### 2. Go: ルート追加（main.go）

```go
// アップロードエンドポイント
r.Post("/uploads", UploadImageHandler)

// アップロード済み画像の静的ファイル配信
r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadsDir))))
```

`http.FileServer` でコンテナ内の `./uploads/` ディレクトリをそのまま配信します。

---

### 3. Docker: アップロード画像の永続化（docker-compose.yml）

```yaml
app:
  volumes:
    - uploads_data:/app/uploads  # 追加

volumes:
  postgres_data:
  uploads_data:    # 追加
```

Docker ボリュームを使うことで、コンテナを再起動・再ビルドしてもアップロード済み画像が消えません。

---

### 4. React: アップロードフックと UI（App.tsx）

```tsx
function useUploadImageMutation() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch(`${BASE_URL}/uploads`, {
        method: "POST",
        body: formData,
      });
      return response.json() as Promise<{ url: string }>;
    },
  });
}
```

```tsx
// ファイル選択後の処理
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  uploadImage(file, {
    onSuccess: ({ url }) => {
      // 返ってきた URL をエディタに挿入
      editor.chain().focus().setImage({ src: `${BASE_URL}${url}` }).run();
    },
  });
  e.target.value = ""; // 同じファイルを再選択できるようリセット
};
```

```tsx
// UI（非表示 input + ボタン）
<input
  type="file"
  accept="image/jpeg,image/png,image/gif,image/webp"
  ref={fileInputRef}
  onChange={handleFileChange}
  className="imageFileInput"   // display: none
/>
<button
  onClick={() => fileInputRef.current?.click()}
  disabled={isUploading}
  className="imageUploadButton"
>
  {isUploading ? "アップロード中..." : "画像をアップロード"}
</button>
```

---

## 使い方

1. 「画像をアップロード」ボタン（紫）をクリック
2. ファイル選択ダイアログで画像ファイルを選ぶ
3. カーソル位置に画像が挿入される
4. 「保存」ボタンで内容を DB に保存
5. ページをリロードしても画像は表示され続ける

---

## 画像の保存先

| 環境 | 保存先 |
|-----|------|
| Docker コンテナ内 | `/app/uploads/` |
| ホスト（Docker ボリューム） | `uploads_data` ボリューム |
| アクセス URL | `http://localhost:8080/uploads/{filename}` |
