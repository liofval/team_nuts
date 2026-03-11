import { useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import {
  useTemplatesQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
} from "../../hooks/useTemplate";
import "./RecruitButton.css";

type Props = {
  editor: Editor | null;
};

function textToHtml(text: string): string {
  return text
    .split("\n\n")
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const DEFAULT_RECRUIT_CONTENT = `■ 採用情報
私たちは一緒に働く仲間を募集しています。

■ 募集職種
・[職種1]
・[職種2]

■ 応募方法
採用ページよりご応募ください。
URL：[採用ページURL]

■ お問い合わせ
[会社名] 採用担当
Email：[メールアドレス]`;

export default function RecruitButton({ editor }: Props) {
  const { data: templates } = useTemplatesQuery();
  const createMutation = useCreateTemplateMutation();
  const updateMutation = useUpdateTemplateMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editContent, setEditContent] = useState("");

  const recruit = templates?.find((t) => t.name === "recruit");

  const handleInsert = () => {
    if (!editor || !recruit) return;
    const html = textToHtml(recruit.content);
    editor.commands.focus("end");
    editor.commands.insertContent(html);
  };

  const handleCreate = () => {
    createMutation.mutate({
      name: "recruit",
      title: "リクルート",
      content: DEFAULT_RECRUIT_CONTENT,
    });
  };

  const openEditModal = () => {
    if (!recruit) return;
    setEditContent(recruit.content);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!recruit) return;
    updateMutation.mutate(
      { id: recruit.id, name: recruit.name, title: recruit.title, content: editContent },
      { onSuccess: () => setIsModalOpen(false) },
    );
  };

  if (!editor) return null;

  return (
    <>
      <div className="recruitSection">
        {recruit ? (
          <>
            <button
              type="button"
              className="recruitSection__insert"
              onClick={handleInsert}
            >
              リクルート情報を挿入
            </button>
            <button
              type="button"
              className="recruitSection__edit"
              onClick={openEditModal}
            >
              編集
            </button>
          </>
        ) : (
          <button
            type="button"
            className="recruitSection__create"
            onClick={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending
              ? "作成中..."
              : "リクルートテンプレートを作成"}
          </button>
        )}
      </div>

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
