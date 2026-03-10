import type { Editor } from "@tiptap/react";
import { useCallback } from "react";
import { TEMPLATES, applyTemplate } from "../../templates";
import "./TemplateToolbar.css";

type Props = {
  editor: Editor | null;
  selectedTemplateIndex: number | null;
  onSelectTemplate: (index: number) => void;
};

export default function TemplateToolbar({
  editor,
  selectedTemplateIndex,
  onSelectTemplate,
}: Props) {
  if (!editor) return null;

  const handleClick = useCallback(
    (index: number) => {
      if (
        !confirm(
          "テンプレートを適用すると、現在の本文が上書きされます。よろしいですか？",
        )
      ) {
        return;
      }
      onSelectTemplate(index);
      applyTemplate(editor, index);
    },
    [editor, onSelectTemplate],
  );

  return (
    <div className="templateToolbar">
      <span className="templateToolbar__label">テンプレート:</span>
      <div className="templateToolbar__buttons">
        {TEMPLATES.map((t, i) => (
          <button
            key={i}
            type="button"
            className={`templateToolbar__btn ${selectedTemplateIndex === i ? "templateToolbar__btn--active" : ""}`}
            onClick={() => handleClick(i)}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
