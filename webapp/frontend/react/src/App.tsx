import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Heading from "@tiptap/extension-heading";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { useState } from "react";
import EditorToolbar from "./components/EditorToolbar";
import "./App.css";

const queryKey = ["fetch-press-release"];
const BASE_URL = "http://localhost:8080";

function usePressReleaseQuery() {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/press-releases/1`);
      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`);
      }
      return response.json();
    },
  });
}

function useSavePressReleaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const response = await fetch(`${BASE_URL}/press-releases/1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("保存に失敗しました");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      alert(`エラー: ${error.message}`);
    },
  });
}

export function App() {
  const { data, isPending, isError } = usePressReleaseQuery();

  if (isPending || isError) return null;

  return <Page title={data.title} content={JSON.parse(data.content)} />;
}

type PressRelease = {
  title: string;
  content: string;
};

function Page({ title: initialTitle, content }: PressRelease) {
  const [title, setTitle] = useState(() => initialTitle);
  const [imageUrl, setImageUrl] = useState("");

  const editor = useEditor({
    extensions: [
      Document,
      Heading,
      Paragraph,
      Text,
      Bold,
      Italic,
      Underline,
      Image,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      BulletList,
      OrderedList,
      ListItem,
    ],
    content,
  });

  const { isPending, mutate } = useSavePressReleaseMutation();

  const handleSave = () => {
    if (!editor) return;
    mutate({
      title,
      content: JSON.stringify(editor.getJSON()),
    });
  };

  const setLink = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("リンク先URLを入力してください", previousUrl);

    if (url === null) return;

    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    if (!/^https?:\/\//.test(url)) {
      window.alert("URLはhttpまたはhttpsで始まる必要があります");
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  const handleInsertImage = () => {
    const url = imageUrl.trim();
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
    setImageUrl("");
  };

  return (
    <div className="container">
      {/* ヘッダー */}
      <header className="header">
        <h1 className="title">プレスリリースエディター</h1>
        <button onClick={handleSave} className="saveButton" disabled={isPending}>
          {isPending ? "保存中..." : "保存"}
        </button>
      </header>

      {/* メインコンテンツ */}
      <main className="main">
        <div className="editorWrapper">
          <div className="titleInputWrapper">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タイトルを入力してください"
              className="titleInput"
            />
          </div>
          <EditorToolbar editor={editor ?? null} />

          {/* リスト・リンクツールバー */}
          <div className="toolbar">
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`toolbarButton${editor?.isActive("bulletList") ? " toolbarButton--active" : ""}`}
              title="箇条書き (Ctrl+Shift+8)"
            >
              <BulletListIcon />
              箇条書き
            </button>

            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`toolbarButton${editor?.isActive("orderedList") ? " toolbarButton--active" : ""}`}
              title="番号付きリスト (Ctrl+Shift+7)"
            >
              <OrderedListIcon />
              番号付き
            </button>

            <button type="button" onClick={setLink} disabled={!editor}>
              リンク追加/編集
            </button>
          </div>

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
          <EditorContent editor={editor} />
        </div>
      </main>
    </div>
  );
}

function BulletListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <circle cx="2" cy="3.5"  r="1.5" fill="currentColor" />
      <circle cx="2" cy="7.5"  r="1.5" fill="currentColor" />
      <circle cx="2" cy="11.5" r="1.5" fill="currentColor" />
      <rect x="5.5" y="2.5"  width="9" height="2" rx="1" fill="currentColor" />
      <rect x="5.5" y="6.5"  width="9" height="2" rx="1" fill="currentColor" />
      <rect x="5.5" y="10.5" width="9" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

function OrderedListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <text x="0" y="5"  fontSize="5" fontWeight="700" fill="currentColor" fontFamily="monospace">1.</text>
      <text x="0" y="9"  fontSize="5" fontWeight="700" fill="currentColor" fontFamily="monospace">2.</text>
      <text x="0" y="13" fontSize="5" fontWeight="700" fill="currentColor" fontFamily="monospace">3.</text>
      <rect x="5.5" y="2.5"  width="9" height="2" rx="1" fill="currentColor" />
      <rect x="5.5" y="6.5"  width="9" height="2" rx="1" fill="currentColor" />
      <rect x="5.5" y="10.5" width="9" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}