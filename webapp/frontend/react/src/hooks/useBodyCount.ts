import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";

export function useBodyCount(editor: Editor | null): number {
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

  return bodyCount;
}
