import type { Editor } from "@tiptap/react";
import "./ListLinkToolbar.css";

type Props = {
  editor: Editor | null;
};

export default function ListLinkToolbar({ editor }: Props) {
  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("リンク先URLを入力してください", previousUrl);

    if (url === null) return;

    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    if (!/^https?:\/\//.test(url)) {
      window.alert("URLはhttpまたはhttpsで始まる必要があります");
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  return (
    <div className="toolbar">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`toolbarButton${editor.isActive("bulletList") ? " toolbarButton--active" : ""}`}
        title="箇条書き (Ctrl+Shift+8)"
      >
        <BulletListIcon />
        箇条書き
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`toolbarButton${editor.isActive("orderedList") ? " toolbarButton--active" : ""}`}
        title="番号付きリスト (Ctrl+Shift+7)"
      >
        <OrderedListIcon />
        番号付き
      </button>

      <button type="button" onClick={setLink}>
        リンク追加/編集
      </button>
    </div>
  );
}

function BulletListIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="2" cy="3.5" r="1.5" fill="currentColor" />
      <circle cx="2" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="2" cy="11.5" r="1.5" fill="currentColor" />
      <rect x="5.5" y="2.5" width="9" height="2" rx="1" fill="currentColor" />
      <rect x="5.5" y="6.5" width="9" height="2" rx="1" fill="currentColor" />
      <rect
        x="5.5"
        y="10.5"
        width="9"
        height="2"
        rx="1"
        fill="currentColor"
      />
    </svg>
  );
}

function OrderedListIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      aria-hidden="true"
    >
      <text
        x="0"
        y="5"
        fontSize="5"
        fontWeight="700"
        fill="currentColor"
        fontFamily="monospace"
      >
        1.
      </text>
      <text
        x="0"
        y="9"
        fontSize="5"
        fontWeight="700"
        fill="currentColor"
        fontFamily="monospace"
      >
        2.
      </text>
      <text
        x="0"
        y="13"
        fontSize="5"
        fontWeight="700"
        fill="currentColor"
        fontFamily="monospace"
      >
        3.
      </text>
      <rect x="5.5" y="2.5" width="9" height="2" rx="1" fill="currentColor" />
      <rect x="5.5" y="6.5" width="9" height="2" rx="1" fill="currentColor" />
      <rect
        x="5.5"
        y="10.5"
        width="9"
        height="2"
        rx="1"
        fill="currentColor"
      />
    </svg>
  );
}
