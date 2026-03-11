import { useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/react";

const AUTOSAVE_INTERVAL_MS = 5000;

type SaveData = {
  title: string;
  content: string;
};

export type SaveStatus = "saved" | "saving" | "unsaved";

export function useAutoSave(
  editor: Editor | null,
  title: string,
  onSave: (data: SaveData) => void,
): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("saved");

  const titleRef = useRef(title);
  const isFirstRender = useRef(true);
  useEffect(() => {
    titleRef.current = title;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setStatus("unsaved");
  }, [title]);

  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // サーバーに保存済みの値を保持する ref
  const savedTitleRef = useRef(title);
  const savedContentRef = useRef(
    editor ? JSON.stringify(editor.getJSON()) : "",
  );

  // editor の update イベントで unsaved に遷移
  useEffect(() => {
    if (!editor) return;
    const handler = () => setStatus("unsaved");
    editor.on("update", handler);
    return () => { editor.off("update", handler); };
  }, [editor]);

  // 5秒ごとに差分チェックして保存
  useEffect(() => {
    if (!editor) return;

    const intervalId = setInterval(() => {
      const currentTitle = titleRef.current;
      const currentContent = JSON.stringify(editor.getJSON());

      const hasChanged =
        currentTitle !== savedTitleRef.current ||
        currentContent !== savedContentRef.current;

      if (!hasChanged) return;

      setStatus("saving");
      onSaveRef.current({ title: currentTitle, content: currentContent });

      savedTitleRef.current = currentTitle;
      savedContentRef.current = currentContent;
      setStatus("saved");
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [editor]);

  return status;
}