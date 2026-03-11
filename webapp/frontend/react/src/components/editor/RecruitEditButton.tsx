import { useState } from "react";
import { createPortal } from "react-dom";
import {
  useTemplatesQuery,
  useUpdateTemplateMutation,
} from "../../hooks/useTemplate";
import "./RecruitButton.css";

type Props = {
  className?: string;
  label?: string;
};

export default function RecruitEditButton({ className, label = "リクルート編集" }: Props) {
  const { data: templates } = useTemplatesQuery();
  const updateMutation = useUpdateTemplateMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editContent, setEditContent] = useState("");

  const recruit = templates?.find((t) => t.name === "recruit");

  if (!recruit) return null;

  const openEditModal = () => {
    setEditContent(recruit.content);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    updateMutation.mutate(
      { id: recruit.id, name: recruit.name, title: recruit.title, content: editContent },
      { onSuccess: () => setIsModalOpen(false) },
    );
  };

  return (
    <>
      <button
        type="button"
        className={className ?? "recruitSection__edit"}
        onClick={openEditModal}
      >
        {label}
      </button>

      {isModalOpen && createPortal(
        <div
          className="recruitModal__overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="recruitModal">
            <h3 className="recruitModal__title">リクルートテンプレート編集</h3>
            <textarea
              className="recruitModal__textarea"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
            <div className="recruitModal__actions">
              <button
                type="button"
                className="recruitModal__cancel"
                onClick={() => setIsModalOpen(false)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="recruitModal__save"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
