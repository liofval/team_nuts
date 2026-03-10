import type { Editor } from "@tiptap/react";
import { useState } from "react";
import type { Comment } from "../../hooks/useComment";

export type CommentThreadProps = {
  comment: Comment;
  editor: Editor;
  onResolve?: (id: number) => void;
  onUnresolve?: (id: number) => void;
  onDelete: (id: number) => void;
  onReply: (parentId: number, commentId: string, body: string) => void;
  onSave: () => void;
  isResolved?: boolean;
};

export default function CommentThread({
  comment,
  editor,
  onResolve,
  onUnresolve,
  onDelete,
  onReply,
  onSave,
  isResolved,
}: CommentThreadProps) {
  const [replyText, setReplyText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);

  const handleHighlightClick = () => {
    // エディタ内の対応するコメントMarkにスクロール
    const { doc } = editor.state;
    let found = false;
    doc.descendants((node, pos) => {
      if (found) return false;
      const mark = node.marks.find(
        (m) => m.type.name === "comment" && m.attrs.commentId === comment.comment_id,
      );
      if (mark) {
        editor.commands.setTextSelection(pos);
        editor.commands.scrollIntoView();
        found = true;
        return false;
      }
      return true;
    });
  };

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, comment.comment_id, replyText.trim());
    setReplyText("");
    setShowReplyInput(false);
  };

  const handleDelete = () => {
    if (!confirm("このコメントを削除しますか？")) return;

    // エディタからマークを削除（返信がない場合のみ）
    if ((comment.replies ?? []).length === 0) {
      const { doc, tr } = editor.state;
      doc.descendants((node, pos) => {
        const mark = node.marks.find(
          (m) => m.type.name === "comment" && m.attrs.commentId === comment.comment_id,
        );
        if (mark) {
          tr.removeMark(pos, pos + node.nodeSize, mark.type);
        }
      });
      editor.view.dispatch(tr);
      onSave();
    }

    onDelete(comment.id);
  };

  return (
    <div className={`commentThread ${isResolved ? "commentResolved" : ""}`}>
      <div className="commentMain">
        <div className="commentBody" onClick={handleHighlightClick}>
          {comment.body}
        </div>
        <div className="commentMeta">
          {new Date(comment.created_at).toLocaleString("ja-JP")}
        </div>
        <div className="commentActions">
          {onResolve && (
            <button
              onClick={() => onResolve(comment.id)}
              className="commentActionButton resolveButton"
            >
              解決
            </button>
          )}
          {onUnresolve && (
            <button
              onClick={() => onUnresolve(comment.id)}
              className="commentActionButton unresolveButton"
            >
              再開
            </button>
          )}
          <button
            onClick={() => setShowReplyInput(!showReplyInput)}
            className="commentActionButton replyButton"
          >
            返信
          </button>
          <button onClick={handleDelete} className="commentActionButton deleteButton">
            削除
          </button>
        </div>
      </div>

      {(comment.replies ?? []).length > 0 && (
        <div className="commentReplies">
          {(comment.replies ?? []).map((reply) => (
            <div key={reply.id} className="commentReply">
              <div className="commentBody">{reply.body}</div>
              <div className="commentMeta">
                {new Date(reply.created_at).toLocaleString("ja-JP")}
              </div>
            </div>
          ))}
        </div>
      )}

      {showReplyInput && (
        <div className="replyInputWrapper">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReply()}
            placeholder="返信を入力..."
            className="replyInput"
            autoFocus
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim()}
            className="replySendButton"
          >
            送信
          </button>
        </div>
      )}
    </div>
  );
}
