import { useState } from "react";
import type { SNSPost } from "../types";
import "./PlatformPreview.css";

type Props = {
  post: SNSPost;
  onUpdate: (postId: number, content: string) => void;
  isUpdating: boolean;
  onPublish?: (postId: number) => void;
  isPublishing?: boolean;
};

const platformConfig = {
  x: { label: "X (Twitter)", maxChars: 280, icon: "𝕏" },
  instagram: { label: "Instagram", maxChars: 2200, icon: "📷" },
} as const;

export default function PlatformPreview({ post, onUpdate, isUpdating, onPublish, isPublishing }: Props) {
  const [editContent, setEditContent] = useState(post.content);
  const [isEditing, setIsEditing] = useState(false);
  const config = platformConfig[post.platform];
  const charCount = [...editContent].length;
  const isOverLimit = charCount > config.maxChars;
  const isPosted = post.status === "posted";

  const handleSave = () => {
    onUpdate(post.id, editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(post.content);
    setIsEditing(false);
  };

  return (
    <div className={`platformPreview ${isPosted ? "platformPreview--posted" : ""}`}>
      <div className="platformPreview__header">
        <span className="platformPreview__icon">{config.icon}</span>
        <span className="platformPreview__label">{config.label}</span>
        {isPosted && <span className="platformPreview__badge">投稿済み</span>}
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

      {isPosted && post.posted_at && (
        <div className="platformPreview__timestamp">
          投稿日時: {new Date(post.posted_at).toLocaleString("ja-JP")}
        </div>
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
            <>
              {!isPosted && (
                <button
                  type="button"
                  className="platformPreview__btn platformPreview__btn--edit"
                  onClick={() => setIsEditing(true)}
                >
                  編集
                </button>
              )}
              {!isPosted && onPublish && post.platform === "x" && (
                <button
                  type="button"
                  className="platformPreview__btn platformPreview__btn--publish"
                  onClick={() => onPublish(post.id)}
                  disabled={isPublishing}
                >
                  {isPublishing ? "投稿中..." : "Xに投稿する"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

    </div>
  );
}
