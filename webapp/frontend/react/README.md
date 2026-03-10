# React実装（フロントエンド）

このディレクトリは React + Vite + TypeScript によるフロントエンド実装です。

バックエンドAPIの起動方法や全体構成は [webapp/README.md](../../README.md) を参照してください。

## 前提条件

- Node.js 20 以上
- npm

## セットアップ

```bash
npm install
```

## 起動

```bash
npm run dev
```

起動後、ブラウザで表示されたURL（通常 `http://localhost:5173`）にアクセスしてください。

## 主な機能

- **リッチテキストエディター**: TipTapベースのWYSIWYGエディター（太字・斜体・下線・リスト・リンク・画像）
- **テンプレート管理**: テンプレートの保存・適用・削除
- **コメント機能**: テキスト選択でコメント追加、スレッド返信、解決/未解決管理
- **Wordインポート**: .docxファイルからの取り込み
- **執筆ワークフロー**: 左サイドバーの4ステップ執筆ガイド
  1. キーワード選択（#新製品, #サービス開始, #提携, #受賞, #イベント, #採用, #決算）
  2. 選択キーワードに応じたプレスリリーステンプレートの適用
  3. AIによるタイトル候補生成
  4. 内容確認・保存

## ディレクトリ構成

```
src/
├── components/
│   ├── editor/          # エディターツールバー
│   ├── comment/         # コメントサイドバー
│   ├── template/        # テンプレートパネル
│   ├── workflow/         # 執筆ワークフロー
│   ├── CharacterCount.tsx
│   ├── DocxImport.tsx
│   └── ValidationAlert.tsx
├── extensions/          # TipTapカスタム拡張
├── hooks/               # カスタムフック
├── App.tsx
└── main.tsx
```

## npmコマンド一覧

- `npm run dev`: 開発サーバーを起動
- `npm run build`: 本番用ビルドを作成
- `npm run preview`: ビルド結果をローカル確認
- `npm run lint`: ESLintを実行
- `npm run fmt`: コードを整形
- `npm run fmt:check`: 整形ルール違反をチェック
