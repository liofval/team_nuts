# フロントエンド（React）の構成

← [ドキュメント一覧に戻る](./README.md)

---

## 画面レイアウト

```
┌─────────────────────────────────────┐
│ プレスリリースエディター      [保存] │
├─────────────────────────────────────┤
│ タイトル入力欄                      │
├─────────────────────────────────────┤
│ 画像URL入力欄            [画像を挿入]│
├─────────────────────────────────────┤
│                                     │
│   TipTap リッチテキストエディタ     │
│   （見出し・段落・テキスト・画像）  │
│                                     │
└─────────────────────────────────────┘
```

---

## App.tsx の主要な処理

`src/App.tsx` にフロントエンドの全ロジックが集約されています。

### データ取得：`usePressReleaseQuery`

```typescript
const { data, isPending, isError } = usePressReleaseQuery();
```

- TanStack React Query を使用して `/press-releases/1` からデータを取得
- キャッシング・リトライ・ローディング状態を自動管理

### データ保存：`useSavePressReleaseMutation`

```typescript
const { isPending, mutate } = useSavePressReleaseMutation();
mutate({ title, content });
```

- 保存ボタンクリック時に POST リクエストを送信
- 保存成功後、クエリキャッシュを自動更新
- エラー時はアラートで通知

### 画像挿入：`handleInsertImage`

```typescript
const [imageUrl, setImageUrl] = useState("");

const handleInsertImage = () => {
  const url = imageUrl.trim();
  if (!url) return;
  editor.chain().focus().setImage({ src: url }).run();
  setImageUrl("");
};
```

- URL 入力欄に URL を入力し「画像を挿入」ボタン（または Enter）で実行
- `editor.chain().focus().setImage(...)` でカーソル位置に画像を挿入
- 挿入後に入力欄を自動クリア

### TipTap エディタ設定

```typescript
const editor = useEditor({
  extensions: [Document, Heading, Paragraph, Text, Image],
  content: data?.content ? JSON.parse(data.content) : "",
});
```

使用している拡張機能: `Document` / `Heading` / `Paragraph` / `Text` / `Image`

---

## 使用ライブラリ

| ライブラリ | 用途 |
|----------|------|
| React 19 | UIフレームワーク |
| TipTap 3.20 | リッチテキストエディタ |
| @tiptap/extension-image | TipTap 画像挿入拡張 |
| TanStack React Query | サーバーデータ管理（キャッシング・再フェッチ） |
| TypeScript 5.9 | 静的型チェック |
| Vite 7 | 高速ビルド・開発サーバー |

---

## TipTap 拡張の追加方法

リスト・太字・斜体など追加の編集機能が必要な場合:

1. パッケージをインストール
2. `App.tsx` の `extensions` 配列に追加

```typescript
import Bold from "@tiptap/extension-bold";

const editor = useEditor({
  extensions: [Document, Heading, Paragraph, Text, Image, Bold],
  // ...
});
```

> 既存の画像挿入機能（`Image`）はそのまま残してください。
