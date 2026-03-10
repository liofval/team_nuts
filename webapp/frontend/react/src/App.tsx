import { useEditor, EditorContent } from "@tiptap/react";
import { useState } from "react";
import {
  usePressReleaseQuery,
  useSavePressReleaseMutation,
} from "./hooks/usePressRelease";
import { useAutoSave } from "./hooks/useAutoSave";
import { useBodyCount } from "./hooks/useBodyCount";
import { useValidation } from "./hooks/useValidation";
import { editorExtensions } from "./extensions";
import EditorToolbar from "./components/editor/EditorToolbar";
import ListLinkToolbar from "./components/editor/ListLinkToolbar";
import ImageToolbar from "./components/editor/ImageToolbar";
import LinkCardToolbar from "./components/editor/LinkCardToolbar";
import TemplatePanel from "./components/template/TemplatePanel";
import DocxImport from "./components/DocxImport";
import CharacterCount from "./components/CharacterCount";
import CommentSidebar from "./components/comment/CommentSidebar";
import ValidationAlert from "./components/ValidationAlert";
import "./App.css";

export function App() {
  const { data, isPending, isError } = usePressReleaseQuery();

  if (isPending || isError) return null;

  return <Page title={data.title} content={JSON.parse(data.content)} />;
}

type PageProps = {
  title: string;
  content: string;
};

function Page({ title: initialTitle, content }: PageProps) {
  const [title, setTitle] = useState(() => initialTitle);

  const editor = useEditor({
    extensions: editorExtensions,
    content,
  });

  const bodyCount = useBodyCount(editor);
  const titleCount = title.length;
  const { messages: validationMessages, showValidation, triggerValidation } =
    useValidation(titleCount, bodyCount);

  const { isPending: isSaving, mutate: save } = useSavePressReleaseMutation();

  useAutoSave(editor ?? null, title, save);

  const handleSave = () => {
    if (!editor) return;
    if (!triggerValidation()) return;

    save({
      title,
      content: JSON.stringify(editor.getJSON()),
    });
  };

  const handleApplyTemplate = (templateTitle: string, templateContent: string) => {
    if (!editor) return;
    setTitle(templateTitle);
    editor.commands.setContent(JSON.parse(templateContent));
  };

  const handleDocxImport = (importedTitle: string, importedContent: string) => {
    if (!editor) return;
    setTitle(importedTitle);
    editor.commands.setContent(JSON.parse(importedContent));
  };

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">プレスリリースエディター</h1>
        <div className="headerActions">
          <DocxImport editor={editor ?? null} onImport={handleDocxImport} />
          <button
            onClick={handleSave}
            className="saveButton"
            disabled={isSaving}
          >
            {isSaving ? "保存中..." : "保存"}
          </button>
        </div>
      </header>

      {/* 3-2: 画面上部にエラー表示（保存時のみ） */}
      {showValidation && validationMessages.length > 0 && (
        <ValidationAlert messages={validationMessages} />
      )}

      <main className="main">
        <div className="mainContent">
          <div className="editorWrapper">
            <div className="titleInputWrapper">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  // 入力を変えたら再保存時に最新の判定を出す（表示自体は維持）
                }}
                placeholder="タイトルを入力してください"
                className="titleInput"
              />
            </div>

            <CharacterCount titleCount={titleCount} bodyCount={bodyCount} />

            <EditorToolbar editor={editor ?? null} />
            <ListLinkToolbar editor={editor ?? null} />
            <ImageToolbar editor={editor ?? null} onSave={handleSave} />
            <LinkCardToolbar editor={editor ?? null} />
            <TemplatePanel
              editor={editor ?? null}
              title={title}
              onApplyTemplate={handleApplyTemplate}
            />
            <EditorContent editor={editor} />
          </div>
          <CommentSidebar editor={editor ?? null} onSave={handleSave} />
        </div>
      </main>
    </div>
  );
}
