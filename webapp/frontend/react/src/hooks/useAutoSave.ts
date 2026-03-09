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
  // setInterval のコールバックから title・onSave の最新値を参照するための ref
  const titleRef = useRef(title);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // 5秒ごとに自動保存
  useEffect(() => {
    if (!editor) return;

    const intervalId = setInterval(() => {
      onSaveRef.current({
        title: titleRef.current,
        content: JSON.stringify(editor.getJSON()),
      });
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [editor]);
}