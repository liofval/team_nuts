import type { Editor } from "@tiptap/react";
import { useRef, useState } from "react";
import { useUploadImageMutation } from "../hooks/useUploadImage";
import { BASE_URL } from "../constants";
import "./ImageToolbar.css";

type Props = {
  editor: Editor | null;
  onSave: () => void;
};

export default function ImageToolbar({ editor, onSave }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isPending: isUploading, mutate: uploadImage } =
    useUploadImageMutation();

  if (!editor) return null;

  const handleInsertImage = () => {
    const url = imageUrl.trim();
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
    setImageUrl("");
    onSave();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage(file, {
      onSuccess: ({ url }) => {
        editor.chain().focus().setImage({ src: `${BASE_URL}${url}` }).run();
        onSave();
      },
      onError: (error) => {
        alert(`エラー: ${error.message}`);
      },
    });
    e.target.value = "";
  };

  return (
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
  );
}