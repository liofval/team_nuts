import {
  useSNSPostsQuery,
  useGenerateSNSMutation,
  useUpdateSNSPostMutation,
  usePublishSNSPostMutation,
} from "../hooks/useSNSPost";
import PlatformPreview from "./PlatformPreview";
import "./SNSPostPanel.css";

type Props = {
  pressReleaseId: number;
  title: string;
  bodyText: string;
};

export default function SNSPostPanel({ pressReleaseId, title, bodyText }: Props) {
  const { data: posts = [] } = useSNSPostsQuery(pressReleaseId);
  const generateMutation = useGenerateSNSMutation(pressReleaseId);
  const updateMutation = useUpdateSNSPostMutation(pressReleaseId);
  const publishMutation = usePublishSNSPostMutation(pressReleaseId);

  const xPost = posts.find((p) => p.platform === "x");
  const instaPost = posts.find((p) => p.platform === "instagram");
  const hasPosts = xPost || instaPost;

  const handleGenerate = () => {
    generateMutation.mutate({ title, content: bodyText });
  };

  return (
    <div className="snsPanel">
      <div className="snsPanel__generate">
        <button
          type="button"
          className="snsPanel__generateBtn"
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? "AIで生成中..." : "AIで投稿文を生成"}
        </button>
        {generateMutation.isPending && (
          <p className="snsPanel__hint">記事の内容をAIが要約しています...</p>
        )}
        {generateMutation.isError && (
          <p className="snsPanel__error">生成に失敗しました。もう一度お試しください。</p>
        )}
      </div>

      {hasPosts && (
        <div className="snsPanel__previews">
          {xPost && (
            <PlatformPreview
              post={xPost}
              onUpdate={(postId, content) => updateMutation.mutate({ postId, content })}
              onPublish={(postId) => publishMutation.mutate(postId)}
              isUpdating={updateMutation.isPending}
              isPublishing={publishMutation.isPending}
            />
          )}
          {instaPost && (
            <PlatformPreview
              post={instaPost}
              onUpdate={(postId, content) => updateMutation.mutate({ postId, content })}
              onPublish={(postId) => publishMutation.mutate(postId)}
              isUpdating={updateMutation.isPending}
              isPublishing={publishMutation.isPending}
            />
          )}
        </div>
      )}

      {!hasPosts && !generateMutation.isPending && (
        <div className="snsPanel__empty">
          <p>まだSNS投稿文がありません。</p>
          <p>「AIで投稿文を生成」ボタンを押して、記事の内容からSNS向けの投稿文を自動生成しましょう。</p>
        </div>
      )}
    </div>
  );
}
