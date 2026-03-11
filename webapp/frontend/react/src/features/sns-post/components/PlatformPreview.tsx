import { useState } from "react";
import type { SNSPost } from "../types";
import "./PlatformPreview.css";

type Props = {
  post: SNSPost;
  onUpdate: (postId: number, content: string) => void;
  isUpdating: boolean;
};

const platformConfig = {
  x: { label: "X (Twitter)", maxChars: 280, icon: "𝕏" },
  instagram: { label: "Instagram", maxChars: 2200, icon: "📷" },
} as const;

export default function PlatformPreview({ post, onUpdate, isUpdating }: Props) {
  const [editContent, setEditContent] = useState(post.content);
  const [isEditing, setIsEditing] = useState(false);
  const config = platformConfig[post.platform];
  const charCount = [...editContent].length;
  const isOverLimit = charCount > config.maxChars;

  const handleSave = () => {
    onUpdate(post.id, editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(post.content);
    setIsEditing(false);
  };

  return (
    <div className="platformPreview">
      <div className="platformPreview__header">
        <span className="platformPreview__icon">{config.icon}</span>
        <span className="platformPreview__label">{config.label}</span>
      </div>

      {isEditing ? (
        <textarea
          className="platformPreview__textarea"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          rows={post.platform === "instagram" ? 12 : 5}
        />
      ) : (
        <div className="platformPreview__content">{post.content}</div>
      )}

      <div className="platformPreview__footer">
        <span className={`platformPreview__charCount ${isOverLimit ? "platformPreview__charCount--over" : ""}`}>
          {charCount} / {config.maxChars}文字
        </span>

        <div className="platformPreview__actions">
          {isEditing ? (
            <>
              <button type="button" className="platformPreview__btn platformPreview__btn--cancel" onClick={handleCancel}>
                キャンセル
              </button>
              <button
                type="button"
                className="platformPreview__btn platformPreview__btn--save"
                onClick={handleSave}
                disabled={isUpdating}
              >
                {isUpdating ? "保存中..." : "保存"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="platformPreview__btn platformPreview__btn--edit"
              onClick={() => setIsEditing(true)}
            >
              編集
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
