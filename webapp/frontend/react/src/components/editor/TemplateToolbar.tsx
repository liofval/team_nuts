import type { Editor } from "@tiptap/react";
import { useState, useRef, useEffect } from "react";
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
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) return null;

  const handleApply = (index: number) => {
    if (
      !confirm(
        "テンプレートを適用すると、現在の本文が上書きされます。よろしいですか？",
      )
    ) {
      return;
    }
    onSelectTemplate(index);
    applyTemplate(editor, index);
    setIsOpen(false);
  };

  return (
    <div className="templateToolbar" ref={wrapperRef}>
      <button
        type="button"
        className={`templateToolbar__toggle ${isOpen ? "templateToolbar__toggle--active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        テンプレート
        <span className="templateToolbar__arrow">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="templateToolbar__dropdown">
          {TEMPLATES.map((t, i) => (
            <button
              key={i}
              type="button"
              className={`templateToolbar__item ${selectedTemplateIndex === i ? "templateToolbar__item--active" : ""}`}
              onClick={() => handleApply(i)}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
