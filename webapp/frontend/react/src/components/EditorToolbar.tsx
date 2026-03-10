import type { Editor } from "@tiptap/react";
import "./EditorToolbar.css";

type Props = {
  editor: Editor | null;
};

export default function EditorToolbar({ editor }: Props) {
  if (!editor) return null;

  return (
    <div className="editorToolbar">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`editorToolbar__btn${editor.isActive("bold") ? " editorToolbar__btn--active" : ""}`}
        title="太字 (Ctrl+B)"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`editorToolbar__btn${editor.isActive("italic") ? " editorToolbar__btn--active" : ""}`}
        title="斜体 (Ctrl+I)"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`editorToolbar__btn${editor.isActive("underline") ? " editorToolbar__btn--active" : ""}`}
        title="下線 (Ctrl+U)"
      >
        <span style={{ textDecoration: "underline" }}>U</span>
      </button>
    </div>
  );
}
