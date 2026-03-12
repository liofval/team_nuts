import { createPortal } from "react-dom";
import { useEffect } from "react";
import {
  useSNSPostsQuery,
  useGenerateSNSMutation,
  useUpdateSNSPostMutation,
  usePublishSNSPostMutation,
} from "../hooks/useSNSPost";
import PlatformPreview from "./PlatformPreview";
import "./SNSPostModal.css";

type Props = {
  open: boolean;
  onClose: () => void;
  pressReleaseId: number;
  title: string;
  bodyText: string;
};

export default function SNSPostModal({ open, onClose, pressReleaseId, title, bodyText }: Props) {
  const { data: posts = [] } = useSNSPostsQuery(pressReleaseId);
  const generateMutation = useGenerateSNSMutation(pressReleaseId);
  const updateMutation = useUpdateSNSPostMutation(pressReleaseId);
  const publishMutation = usePublishSNSPostMutation(pressReleaseId);

  // 最新のX / Instagramの投稿を取得
  const xPost = posts.find((p) => p.platform === "x");
  const instaPost = posts.find((p) => p.platform === "instagram");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleGenerate = () => {
    generateMutation.mutate({ title, content: bodyText });
  };

  const hasPosts = xPost || instaPost;

  return createPortal(
    <div
      className="snsModal__overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="snsModal">
        <div className="snsModal__header">
          <h3 className="snsModal__title">SNS投稿</h3>
          <button type="button" className="snsModal__close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="snsModal__generate">
          <button
            type="button"
            className="snsModal__generateBtn"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? "AIで生成中..." : "下書きを作成"}
          </button>
          {generateMutation.isPending && (
            <p className="snsModal__hint">記事の内容をAIが要約しています。しばらくお待ちください...</p>
          )}
          {generateMutation.isError && (
            <p className="snsModal__error">生成に失敗しました。もう一度お試しください。</p>
          )}
        </div>

        {hasPosts && (
          <div className="snsModal__previews">
            {xPost && (
              <PlatformPreview
                post={xPost}
                onUpdate={(postId, content) => updateMutation.mutate({ postId, content })}
                isUpdating={updateMutation.isPending}
                onPublish={(postId) => publishMutation.mutate(postId)}
                isPublishing={publishMutation.isPending}
              />
            )}
            {instaPost && (
              <PlatformPreview
                post={instaPost}
                onUpdate={(postId, content) => updateMutation.mutate({ postId, content })}
                isUpdating={updateMutation.isPending}
              />
            )}
          </div>
        )}

        {!hasPosts && !generateMutation.isPending && (
          <div className="snsModal__empty">
            <p>まだSNS投稿文がありません。</p>
            <p>「下書きを作成」ボタンを押して、記事の内容からSNS向けの下書きを自動生成しましょう。</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
