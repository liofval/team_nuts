import type { Editor } from "@tiptap/react";
import { useState } from "react";
import {
  useCommentsQuery,
  useCreateCommentMutation,
  useResolveCommentMutation,
  useUnresolveCommentMutation,
  useDeleteCommentMutation,
} from "../../hooks/useComment";
import CommentThread from "./CommentThread";
import "./CommentSidebar.css";

type Props = {
  editor: Editor | null;
  onSave: () => void;
};

export default function CommentSidebar({ editor, onSave }: Props) {
  const [showResolved, setShowResolved] = useState(false);
  const { data: comments, isPending } = useCommentsQuery();
  const { mutate: createComment } = useCreateCommentMutation();
  const { mutate: resolveComment } = useResolveCommentMutation();
  const { mutate: unresolveComment } = useUnresolveCommentMutation();
  const { mutate: deleteComment } = useDeleteCommentMutation();

  if (!editor) return null;

  const handleAddComment = () => {
    const { from, to } = editor.state.selection;
    if (from === to) {
      alert("コメントをつけるテキストを選択してください");
      return;
    }

    const body = prompt("コメントを入力してください");
    if (!body?.trim()) return;

    const commentId = crypto.randomUUID();

    // エディタにマークを付与
    editor.chain().focus().setComment(commentId).run();
    onSave();

    // サーバーに保存
    createComment({ comment_id: commentId, body: body.trim() });
  };

  const activeComments = comments?.filter((c) => !c.resolved) ?? [];
  const resolvedComments = comments?.filter((c) => c.resolved) ?? [];

  return (
    <div className="commentSidebar">
      <div className="commentSidebarHeader">
        <h3 className="commentSidebarTitle">コメント</h3>
        <button onClick={handleAddComment} className="addCommentButton">
          + コメント追加
        </button>
      </div>

      {isPending ? (
        <p className="commentLoading">読み込み中...</p>
      ) : (
        <>
          {activeComments.length === 0 && (
            <p className="commentEmpty">コメントはありません</p>
          )}
          {activeComments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              editor={editor}
              onResolve={(id) => resolveComment(id)}
              onDelete={(id) => deleteComment(id)}
              onReply={(parentId, commentId, body) =>
                createComment({ parent_id: parentId, comment_id: commentId, body })
              }
              onSave={onSave}
            />
          ))}

          {resolvedComments.length > 0 && (
            <div className="resolvedSection">
              <button
                onClick={() => setShowResolved(!showResolved)}
                className="resolvedToggle"
              >
                {showResolved ? "解決済みを非表示" : `解決済み (${resolvedComments.length})`}
              </button>
              {showResolved &&
                resolvedComments.map((comment) => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    editor={editor}
                    onUnresolve={(id) => unresolveComment(id)}
                    onDelete={(id) => deleteComment(id)}
                    onReply={(parentId, commentId, body) =>
                      createComment({
                        parent_id: parentId,
                        comment_id: commentId,
                        body,
                      })
                    }
                    onSave={onSave}
                    isResolved
                  />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
