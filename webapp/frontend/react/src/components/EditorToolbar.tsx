import type { Editor } from "@tiptap/react";
import "./EditorToolbar.css";

type Props = {
  editor: Editor | null;
};

export default function EditorToolbar({ editor }: Props) {
  if (!editor) return null;

  return (
    <div className="toolbar">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`toolbarButton${editor.isActive("bold") ? " active" : ""}`}
        title="太字 (Ctrl+B)"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`toolbarButton italic${editor.isActive("italic") ? " active" : ""}`}
        title="斜体 (Ctrl+I)"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`toolbarButton underline${editor.isActive("underline") ? " active" : ""}`}
        title="下線 (Ctrl+U)"
      >
        <span style={{ textDecoration: "underline" }}>U</span>
      </button>
    </div>
  );
}
