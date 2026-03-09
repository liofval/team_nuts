import type { Editor } from "@tiptap/react";
import { useRef, useState } from "react";
import { uploadImageToS3 } from "../hooks/useUploadImageS3";
import { validateImageFile, ACCEPT_IMAGE_TYPES } from "../hooks/imageValidation";
import "./ImageToolbar.css";

type Props = {
  editor: Editor | null;
  onSave: () => void;
};

export default function ImageToolbar({ editor, onSave }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  const handleInsertImage = () => {
    const url = imageUrl.trim();
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
    setImageUrl("");
    onSave();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);

    // バリデーション: 全ファイルを事前チェック
    const errors: string[] = [];
    for (const file of fileList) {
      const error = validateImageFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      }
    }
    if (errors.length > 0) {
      alert(`エラー:\n${errors.join("\n")}`);
      e.target.value = "";
      return;
    }

    setIsUploading(true);

    // 全ファイルを並列アップロード（S3プリサイン経由）
    const results = await Promise.allSettled(
      fileList.map((file) => uploadImageToS3(file)),
    );

    const uploadErrors: string[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled") {
        editor.chain().focus().setImage({ src: result.value.url }).run();
      } else {
        uploadErrors.push(`${fileList[i].name}: ${result.reason.message}`);
      }
    }

    if (uploadErrors.length > 0) {
      alert(`アップロードエラー:\n${uploadErrors.join("\n")}`);
    }

    onSave();
    setIsUploading(false);
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
        accept={ACCEPT_IMAGE_TYPES}
        multiple
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