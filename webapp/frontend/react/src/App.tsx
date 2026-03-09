import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useState } from "react";
import {
  usePressReleaseQuery,
  useSavePressReleaseMutation,
} from "./hooks/usePressRelease";
import { useAutoSave } from "./hooks/useAutoSave";
import { editorExtensions } from "./extensions";
import { ImageDropPaste } from "./hooks/useImageDropPaste";
import EditorToolbar from "./components/EditorToolbar";
import ListLinkToolbar from "./components/ListLinkToolbar";
import ImageToolbar from "./components/ImageToolbar";
import LinkCardToolbar from "./components/LinkCardToolbar";
import CharacterCount from "./components/CharacterCount";
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
    extensions: [...editorExtensions, ImageDropPaste],
    content,
  });

  const [bodyCount, setBodyCount] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const update = () => setBodyCount(editor.getText().length);
    update();
    editor.on("update", update);

    return () => {
      editor.off("update", update);
    };
  }, [editor]);

  const { isPending: isSaving, mutate: save } = useSavePressReleaseMutation();

  useAutoSave(editor ?? null, title, save);

  const handleSave = () => {
    if (!editor) return;
    save({
      title,
      content: JSON.stringify(editor.getJSON()),
    });
  };

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">プレスリリースエディター</h1>
        <button
          onClick={handleSave}
          className="saveButton"
          disabled={isSaving}
        >
          {isSaving ? "保存中..." : "保存"}
        </button>
      </header>

      <main className="main">
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

          <CharacterCount titleCount={title.length} bodyCount={bodyCount} />

          <EditorToolbar editor={editor ?? null} />
          <ListLinkToolbar editor={editor ?? null} />
          <ImageToolbar editor={editor ?? null} onSave={handleSave} />
          <LinkCardToolbar editor={editor ?? null} />
          <EditorContent editor={editor} />
        </div>
      </main>
    </div>
  );
}