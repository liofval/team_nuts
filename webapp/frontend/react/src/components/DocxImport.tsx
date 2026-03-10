import { useRef, useState } from "react";
import { BASE_URL } from "../constants";
import type { Editor } from "@tiptap/react";
import "./DocxImport.css";

type Props = {
  editor: Editor | null;
  onImport: (title: string, content: string) => void;
};

export default function DocxImport({ editor, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    if (!file.name.toLowerCase().endsWith(".docx")) {
      alert(".docx ファイルのみインポート可能です");
      return;
    }

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${BASE_URL}/import-docx`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "インポートに失敗しました");
      }

      const data = await response.json();
      onImport(data.title, data.content);
    } catch (err) {
      alert(err instanceof Error ? err.message : "インポートに失敗しました");
    } finally {
      setIsImporting(false);
      // ファイル入力をリセット（同じファイルを再選択可能にする）
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <button
        onClick={handleClick}
        className="docxImportButton"
        disabled={isImporting || !editor}
      >
        {isImporting ? "インポート中..." : "Wordインポート"}
      </button>
    </>
  );
}
