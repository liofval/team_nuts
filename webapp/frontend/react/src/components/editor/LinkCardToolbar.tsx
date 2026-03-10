import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { useOgpQuery } from "../../hooks/useOgpQuery";
import "./LinkCardToolbar.css";

type Props = {
  editor: Editor | null;
};

export default function LinkCardToolbar({ editor }: Props) {
  const [inputUrl, setInputUrl] = useState("");
  const [fetchUrl, setFetchUrl] = useState("");

  const { data, isFetching, isError, refetch } = useOgpQuery(fetchUrl);

  if (!editor) return null;

  const handleFetch = () => {
    const url = inputUrl.trim();
    if (!url) return;
    setFetchUrl(url);
    // fetchUrl がセットされた後に refetch を呼ぶ
    setTimeout(() => refetch(), 0);
  };

  const handleInsert = () => {
    if (!data) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "linkCard",
        attrs: {
          url: data.url,
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
        },
      })
      .run();
    setInputUrl("");
    setFetchUrl("");
  };

  return (
    <div className="linkCardToolbar">
      <div className="linkCardToolbar__inputRow">
        <input
          type="url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          placeholder="URLを入力してリンクカードを作成"
          className="linkCardToolbar__input"
        />
        <button
          onClick={handleFetch}
          disabled={!inputUrl.trim() || isFetching}
          className="linkCardToolbar__fetchButton"
        >
          {isFetching ? "取得中..." : "OGP取得"}
        </button>
      </div>

      {isError && (
        <p className="linkCardToolbar__error">
          OGP情報の取得に失敗しました。URLを確認してください。
        </p>
      )}

      {data && !isFetching && (
        <div className="linkCardToolbar__preview">
          {data.imageUrl && (
            <img
              src={data.imageUrl}
              alt={data.title}
              className="linkCardToolbar__previewImage"
            />
          )}
          <div className="linkCardToolbar__previewBody">
            <p className="linkCardToolbar__previewTitle">
              {data.title || "（タイトルなし）"}
            </p>
            <p className="linkCardToolbar__previewDescription">
              {data.description}
            </p>
            <p className="linkCardToolbar__previewUrl">{data.url}</p>
          </div>
          <button
            onClick={handleInsert}
            className="linkCardToolbar__insertButton"
          >
            挿入
          </button>
        </div>
      )}
    </div>
  );
}