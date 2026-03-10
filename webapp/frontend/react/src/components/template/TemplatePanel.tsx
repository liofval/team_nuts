import type { Editor } from "@tiptap/react";
import { useState } from "react";
import {
  useTemplatesQuery,
  useCreateTemplateMutation,
  useDeleteTemplateMutation,
} from "../../hooks/useTemplate";
import "./TemplatePanel.css";

type Props = {
  editor: Editor | null;
  title: string;
  onApplyTemplate: (title: string, content: string) => void;
};

export default function TemplatePanel({ editor, title, onApplyTemplate }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const { data: templates, isPending } = useTemplatesQuery();
  const { mutate: createTemplate, isPending: isSaving } =
    useCreateTemplateMutation();
  const { mutate: deleteTemplate } = useDeleteTemplateMutation();

  if (!editor) return null;

  const handleSaveAsTemplate = () => {
    const name = templateName.trim();
    if (!name) return;

    createTemplate(
      {
        name,
        title,
        content: JSON.stringify(editor.getJSON()),
      },
      {
        onSuccess: () => {
          setTemplateName("");
        },
      },
    );
  };

  const handleApplyTemplate = (templateTitle: string, templateContent: string) => {
    if (
      !confirm(
        "テンプレートを適用すると、現在の内容が上書きされます。よろしいですか？",
      )
    ) {
      return;
    }
    onApplyTemplate(templateTitle, templateContent);
  };

  const handleDeleteTemplate = (id: number, name: string) => {
    if (!confirm(`テンプレート「${name}」を削除しますか？`)) return;
    deleteTemplate(id);
  };

  return (
    <div className="templatePanel">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="templateToggleButton"
      >
        {isOpen ? "テンプレートを閉じる" : "テンプレート"}
      </button>

      {isOpen && (
        <div className="templateContent">
          <div className="templateSaveSection">
            <h3 className="templateSectionTitle">
              現在の内容をテンプレートとして保存
            </h3>
            <div className="templateSaveForm">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveAsTemplate()}
                placeholder="テンプレート名を入力"
                className="templateNameInput"
              />
              <button
                onClick={handleSaveAsTemplate}
                disabled={!templateName.trim() || isSaving}
                className="templateSaveButton"
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>

          <div className="templateListSection">
            <h3 className="templateSectionTitle">
              テンプレートから作成
            </h3>
            {isPending ? (
              <p className="templateLoading">読み込み中...</p>
            ) : !templates || templates.length === 0 ? (
              <p className="templateEmpty">
                保存されたテンプレートはありません
              </p>
            ) : (
              <ul className="templateList">
                {templates.map((t) => (
                  <li key={t.id} className="templateItem">
                    <div className="templateItemInfo">
                      <span className="templateItemName">{t.name}</span>
                      <span className="templateItemDate">
                        {new Date(t.updated_at).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                    <div className="templateItemActions">
                      <button
                        onClick={() =>
                          handleApplyTemplate(t.title, t.content)
                        }
                        className="templateApplyButton"
                      >
                        適用
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(t.id, t.name)}
                        className="templateDeleteButton"
                      >
                        削除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
