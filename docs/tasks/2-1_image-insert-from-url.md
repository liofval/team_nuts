# 2-1: URLから画像の追加（画像追加機能）

← [ドキュメント一覧に戻る](../README.md)

---

## 概要

プレスリリースエディタのテキスト本文内に、URL を指定して画像を挿入できる機能を追加しました。

---

## 変更ファイル

| ファイル | 変更内容 |
|--------|--------|
| `webapp/frontend/react/package.json` | `@tiptap/extension-image` を依存関係に追加 |
| `webapp/frontend/react/src/App.tsx` | Image 拡張の有効化・URL 入力フォームの追加 |
| `webapp/frontend/react/src/App.css` | URL 入力フォームと画像表示のスタイル追加 |

---

## 実装内容

### 1. パッケージの追加

TipTap 公式の画像拡張機能をインストールしました。

```bash
npm install @tiptap/extension-image
```

---

### 2. TipTap に Image 拡張を追加（App.tsx）

```tsx
import Image from "@tiptap/extension-image";

const editor = useEditor({
  extensions: [Document, Heading, Paragraph, Text, Image], // Image を追加
  content,
});
```

これにより、エディタが `<img>` ノードを扱えるようになります。

---

### 3. URL 入力フォームと挿入ロジック（App.tsx）

```tsx
const [imageUrl, setImageUrl] = useState("");

const handleInsertImage = () => {
  const url = imageUrl.trim();
  if (!url) return;
  editor.chain().focus().setImage({ src: url }).run(); // カーソル位置に画像を挿入
  setImageUrl(""); // 挿入後に入力欄をクリア
};
```

- `editor.chain().focus().setImage({ src: url }).run()` が画像挿入の核心部分
- `chain()` で複数のコマンドをつなげる
- `focus()` でエディタにフォーカスを戻してからカーソル位置に挿入

---

### 4. UI の追加（App.tsx）

タイトル入力欄とエディタ本文の間に配置しています。

```tsx
<div className="imageInsertWrapper">
  <input
    type="url"
    value={imageUrl}
    onChange={(e) => setImageUrl(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && handleInsertImage()}
    placeholder="画像URLを入力してください"
    className="imageUrlInput"
  />
  <button
    onClick={handleInsertImage}
    disabled={!imageUrl.trim()}
    className="imageInsertButton"
  >
    画像を挿入
  </button>
</div>
```

- `type="url"` でブラウザ側の URL バリデーションを有効化
- `onKeyDown` で Enter キーによる挿入をサポート
- `disabled={!imageUrl.trim()}` で空欄時はボタンを無効化

---

### 5. スタイルの追加（App.css）

```css
/* フォーム全体 */
.imageInsertWrapper {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

/* エディタ内の画像 */
.tiptap img {
  max-width: 100%;   /* 横幅をエディタに合わせる */
  height: auto;      /* 縦横比を維持 */
  border-radius: 4px;
  display: block;
  margin: 1em 0;
}
```

---

## 使い方

1. エディタ上の「画像URLを入力してください」欄に画像の URL を貼り付ける
2. 「画像を挿入」ボタンを押す（または Enter キー）
3. カーソル位置に画像が表示される
4. 「保存」ボタンで DB に保存する

---

## テスト用 URL

| 画像 | URL |
|-----|-----|
| プレースホルダー画像 | `https://placehold.jp/600x400.png` |
| PNG（透過） | `https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png` |
| 風景写真 | `https://www.w3schools.com/css/img_5terre.jpg` |
