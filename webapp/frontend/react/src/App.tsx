import { useEditor, EditorContent } from "@tiptap/react";
import { useState } from "react";
import {
  usePressReleaseQuery,
  useSavePressReleaseMutation,
} from "./hooks/usePressRelease";
import { useAutoSave } from "./hooks/useAutoSave";
import { useBodyCount } from "./hooks/useBodyCount";
import { useValidation } from "./hooks/useValidation";
import { useTagSuggestQuery, useSaveTagsMutation } from "./hooks/useTag";
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
import TagInput from "./components/TagInput/TagInput";
import "./App.css";

export function App() {
  const { data, isPending, isError } = usePressReleaseQuery();

  if (isPending || isError) return null;

  return (
    <Page
      title={data.title}
      content={JSON.parse(data.content)}
      tags={data.tags ?? []}
    />
  );
}

type PageProps = {
  title: string;
  content: string;
  tags: string[];
};

function Page({ title: initialTitle, content, tags: initialTags }: PageProps) {
  const [title, setTitle] = useState(() => initialTitle);
  const [tagQuery, setTagQuery] = useState("");

  const editor = useEditor({
    extensions: editorExtensions,
    content,
  });

  const bodyCount = useBodyCount(editor);
  const titleCount = title.length;
  const { messages: validationMessages, showValidation, triggerValidation } =
    useValidation(titleCount, bodyCount);

  const { isPending: isSaving, mutate: save } = useSavePressReleaseMutation();
  const { mutate: saveTags } = useSaveTagsMutation(1);
  const { data: tagItems = [] } = useTagSuggestQuery(tagQuery);

  const suggestions = tagItems.map((t) => ({ label: t.name, count: t.count }));

  useAutoSave(editor ?? null, title, save);

  const handleSave = () => {
    if (!editor) return;
    if (!triggerValidation()) return;

    save({
      title,
      content: JSON.stringify(editor.getJSON()),
    });
  };

  const handleTagChange = (newTags: string[]) => {
    saveTags(newTags);
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
                onChange={(e) => setTitle(e.target.value)}
                placeholder="タイトルを入力してください"
                className="titleInput"
              />
            </div>

            <TagInput
              initialTags={initialTags}
              suggestions={suggestions}
              onChange={handleTagChange}
              onInputChange={setTagQuery}
            />

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