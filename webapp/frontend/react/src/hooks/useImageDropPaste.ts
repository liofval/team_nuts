import type { EditorProps } from "@tiptap/pm/view";
import { BASE_URL } from "../constants";

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch(`${BASE_URL}/uploads`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message ?? "アップロードに失敗しました");
  }
  const { url } = (await response.json()) as { url: string };
  return `${BASE_URL}${url}`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export const imageDropPasteProps: EditorProps = {
  handleDrop(view, event, _slice, moved) {
    if (moved) return false;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return false;

    const imageFiles = Array.from(files).filter(isImageFile);
    if (imageFiles.length === 0) return false;

    event.preventDefault();

    const pos = view.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    });

    for (const file of imageFiles) {
      uploadImage(file)
        .then((src) => {
          const node = view.state.schema.nodes.image.create({ src });
          const insertPos = pos?.pos ?? view.state.doc.content.size;
          const tr = view.state.tr.insert(insertPos, node);
          view.dispatch(tr);
        })
        .catch((err) => {
          alert(`画像アップロードエラー: ${err.message}`);
        });
    }

    return true;
  },

  handlePaste(view, event) {
    const items = event.clipboardData?.items;
    if (!items) return false;

    const imageFiles = Array.from(items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (imageFiles.length === 0) return false;

    event.preventDefault();

    for (const file of imageFiles) {
      uploadImage(file)
        .then((src) => {
          const node = view.state.schema.nodes.image.create({ src });
          const tr = view.state.tr.insert(view.state.selection.anchor, node);
          view.dispatch(tr);
        })
        .catch((err) => {
          alert(`画像アップロードエラー: ${err.message}`);
        });
    }

    return true;
  },
};
