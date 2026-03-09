import { useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";

const AUTOSAVE_INTERVAL_MS = 5000;

type SaveData = {
  title: string;
  content: string;
};

export function useAutoSave(
  editor: Editor | null,
  title: string,
  onSave: (data: SaveData) => void,
) {
  const titleRef = useRef(title);
  useEffect(() => {
    titleRef.current = title;
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

      onSaveRef.current({ title: currentTitle, content: currentContent });

      savedTitleRef.current = currentTitle;
      savedContentRef.current = currentContent;
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [editor]);
}