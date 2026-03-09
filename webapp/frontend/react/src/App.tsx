import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";
import {
  usePressReleaseQuery,
  useSavePressReleaseMutation,
} from "./hooks/usePressRelease";
import { editorExtensions } from "./extensions";
import EditorToolbar from "./components/EditorToolbar";
import ListLinkToolbar from "./components/ListLinkToolbar";
import ImageToolbar from "./components/ImageToolbar";
import CharacterCount from "./components/CharacterCount";
import ValidationAlert from "./components/ValidationAlert";
import { BODY_MAX, TITLE_MAX } from "./constants";
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

  const titleCount = title.length;

  const validationMessages = useMemo(() => {
    const messages: string[] = [];
    if (titleCount > TITLE_MAX) {
      messages.push(`タイトルは${TITLE_MAX}文字以内で入力してください。`);
    }
    if (bodyCount > BODY_MAX) {
      messages.push(`本文は${BODY_MAX}文字以内で入力してください。`);
    }
    return messages;
  }, [titleCount, bodyCount]);

  // 保存しようとしたときだけ上部にエラーを出す（常時赤くしない）
  const [showValidation, setShowValidation] = useState(false);

  const { isPending: isSaving, mutate: save } = useSavePressReleaseMutation();

  const handleSave = () => {
    if (!editor) return;

    if (validationMessages.length > 0) {
      setShowValidation(true);
      return;
    }

    setShowValidation(false);

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

      {/* 3-2: 画面上部にエラー表示（保存時のみ） */}
      {showValidation && validationMessages.length > 0 && (
        <ValidationAlert messages={validationMessages} />
      )}

      <main className="main">
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
          <ImageToolbar editor={editor ?? null} />
          <EditorContent editor={editor} />
        </div>
      </main>
    </div>
  );
}