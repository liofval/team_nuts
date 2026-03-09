import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import Heading from "@tiptap/extension-heading";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Image from "@tiptap/extension-image";
import { useRef, useState } from "react";
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

function useUploadImageMutation() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch(`${BASE_URL}/uploads`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message ?? "アップロードに失敗しました");
      }
      return response.json() as Promise<{ url: string }>;
    },
  });
}

function Page({ title: initialTitle, content }: PressRelease) {
  const [title, setTitle] = useState(() => initialTitle);
  const [imageUrl, setImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: [Document, Heading, Paragraph, Text, Image],
    content,
  });

  const { isPending: isSaving, mutate: save } = useSavePressReleaseMutation();
  const { isPending: isUploading, mutate: uploadImage } =
    useUploadImageMutation();

  const handleSave = () => {
    save({
      title,
      content: JSON.stringify(editor.getJSON()),
    });
  };

  const handleInsertImage = () => {
    const url = imageUrl.trim();
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
    setImageUrl("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage(file, {
      onSuccess: ({ url }) => {
        editor.chain().focus().setImage({ src: `${BASE_URL}${url}` }).run();
      },
      onError: (error) => {
        alert(`エラー: ${error.message}`);
      },
    });
    // 同じファイルを再選択できるようリセット
    e.target.value = "";
  };

  return (
    <div className="container">
      {/* ヘッダー */}
      <header className="header">
        <h1 className="title">プレスリリースエディター</h1>
        <button
          onClick={handleSave}
          className="saveButton"
          disabled={isSaving}
        >
          {isSaving ? "保存中..." : "保存"}
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
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="imageFileInput"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="imageUploadButton"
            >
              {isUploading ? "アップロード中..." : "画像をアップロード"}
            </button>
          </div>
          <EditorContent editor={editor} />
        </div>
      </main>
    </div>
  );
}
