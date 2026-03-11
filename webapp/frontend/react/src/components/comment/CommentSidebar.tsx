import type { Editor } from "@tiptap/react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  useCommentsQuery,
  useCreateCommentMutation,
  useResolveCommentMutation,
  useUnresolveCommentMutation,
  useDeleteCommentMutation,
} from "../../hooks/useComment";
import CommentThread from "./CommentThread";
import "./CommentSidebar.css";

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 300;

type Props = {
  editor: Editor | null;
  pressReleaseId: number;
  onSave: () => void;
};

export default function CommentSidebar({ editor, pressReleaseId, onSave }: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [showResolved, setShowResolved] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [addError, setAddError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDragging = useRef(false);
  const { data: comments, isPending } = useCommentsQuery(pressReleaseId);
  const { mutate: createComment } = useCreateCommentMutation(pressReleaseId);
  const { mutate: resolveComment } = useResolveCommentMutation(pressReleaseId);
  const { mutate: unresolveComment } = useUnresolveCommentMutation(pressReleaseId);
  const { mutate: deleteComment } = useDeleteCommentMutation(pressReleaseId);

  useEffect(() => {
    if (isAdding && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isAdding]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const newWidth = window.innerWidth - e.clientX;
    setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  if (!editor) return null;

  const handleStartAdd = () => {
    const { from, to } = editor.state.selection;
    if (from === to) {
      setAddError("テキストを選択してからコメントを追加してください");
      setTimeout(() => setAddError(""), 3000);
      return;
    }
    setAddError("");
    setIsAdding(true);
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;

    const { from, to } = editor.state.selection;
    if (from === to) {
      setAddError("テキストの選択が解除されました。再度選択してください");
      setTimeout(() => setAddError(""), 3000);
      return;
    }

    const commentId = crypto.randomUUID();
    editor.chain().focus().setComment(commentId).run();
    onSave();
    createComment({ comment_id: commentId, body: newComment.trim() });

    setNewComment("");
    setIsAdding(false);
  };

  const handleCancelAdd = () => {
    setNewComment("");
    setIsAdding(false);
    setAddError("");
  };

  const activeComments = comments?.filter((c) => !c.resolved) ?? [];
  const resolvedComments = comments?.filter((c) => c.resolved) ?? [];
  const totalCount = (comments?.length ?? 0);

  if (!isOpen) {
    return (
      <button
        className="commentSidebarFab"
        onClick={() => setIsOpen(true)}
        title="コメントを開く"
      >
        <svg className="commentSidebarFab__icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
        </svg>
        {totalCount > 0 && (
          <span className="commentSidebarFab__badge">{totalCount}</span>
        )}
      </button>
    );
  }

  return (
    <div className="commentSidebar" style={{ width }}>
      <div className="commentSidebarResizeHandle" onMouseDown={handleDragStart} />
      <div className="commentSidebarHeader">
        <h3 className="commentSidebarTitle">コメント</h3>
        <div className="commentSidebarHeaderActions">
          {!isAdding && (
            <button onClick={handleStartAdd} className="addCommentButton">
              + コメント追加
            </button>
          )}
          <button
            className="commentSidebarCollapseBtn"
            onClick={() => setIsOpen(false)}
            title="コメントを閉じる"
          >
            &rsaquo;
          </button>
        </div>
      </div>

      {addError && (
        <div className="commentAddError">{addError}</div>
      )}

      {isAdding && (
        <div className="commentAddForm">
          <textarea
            ref={textareaRef}
            className="commentAddTextarea"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmitComment();
              if (e.key === "Escape") handleCancelAdd();
            }}
            placeholder="コメントを入力..."
            rows={3}
          />
          <div className="commentAddFormActions">
            <button
              type="button"
              className="commentAddCancelBtn"
              onClick={handleCancelAdd}
            >
              キャンセル
            </button>
            <button
              type="button"
              className="commentAddSubmitBtn"
              onClick={handleSubmitComment}
              disabled={!newComment.trim()}
            >
              追加
            </button>
          </div>
          <p className="commentAddHint">Cmd+Enter で送信</p>
        </div>
      )}

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
