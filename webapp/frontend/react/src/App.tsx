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
import TemplateToolbar from "./components/editor/TemplateToolbar";
import ImageToolbar from "./components/editor/ImageToolbar";
import LinkCardToolbar from "./components/editor/LinkCardToolbar";
import DocxImport from "./components/DocxImport";
import CharacterCount from "./components/CharacterCount";
import CommentSidebar from "./components/comment/CommentSidebar";
import LeftSidebar from "./components/workflow/LeftSidebar";
import ValidationAlert from "./components/ValidationAlert";
import TagInput from "./components/TagInput/TagInput";
import { ReferenceSearchOverlay } from "./features/reference-search";
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
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<
    number | null
  >(null);


  const editor = useEditor({
    extensions: editorExtensions,
    content,
  });

  // 追加: reference search 開閉
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);

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

          {/* 追加: 参考記事検索 */}
          <button
            type="button"
            className="saveButton"
            onClick={() => setIsReferenceOpen(true)}
          >
            参考記事を検索
          </button>

          <button
            onClick={handleSave}
            className="saveButton"
            disabled={isSaving}
            type="button"
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
          <LeftSidebar
            editor={editor ?? null}
            title={title}
            setTitle={setTitle}
            onSave={handleSave}
            selectedTemplateIndex={selectedTemplateIndex}
            onSelectTemplate={setSelectedTemplateIndex}
          />
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
            <TemplateToolbar
              editor={editor ?? null}
              selectedTemplateIndex={selectedTemplateIndex}
              onSelectTemplate={setSelectedTemplateIndex}
            />
            <ImageToolbar editor={editor ?? null} onSave={handleSave} />
            <LinkCardToolbar editor={editor ?? null} />
            <EditorContent editor={editor} />
          </div>

          <CommentSidebar editor={editor ?? null} onSave={handleSave} />
        </div>
      </main>

      {/* 追加: Overlay */}
      <ReferenceSearchOverlay
        open={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        editor={editor ?? null}
      />
    </div>
  );
}