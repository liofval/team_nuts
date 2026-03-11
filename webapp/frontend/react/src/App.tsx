import { useEditor, EditorContent } from "@tiptap/react";
import { useState, useEffect } from "react";
import {
  usePressReleaseQuery,
  useSavePressReleaseMutation,
  usePressReleaseListQuery,
  useCreatePressReleaseMutation,
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
import ArticleListPage from "./components/ArticleListPage";
import type { PressReleaseSummary } from "./hooks/usePressRelease";
import { ReferenceSearchOverlay } from "./features/reference-search";
import "./App.css";

function getIdFromUrl(): number | null {
  const params = new URLSearchParams(window.location.search);
  const v = params.get("id");
  if (!v) return null;
  const n = parseInt(v, 10);
  return isNaN(n) || n <= 0 ? null : n;
}

function setIdInUrl(id: number | null) {
  const url = new URL(window.location.href);
  if (id != null) {
    url.searchParams.set("id", String(id));
  } else {
    url.searchParams.delete("id");
  }
  window.history.replaceState(null, "", url.toString());
}

export function App() {
  const { data: articles = [], isPending: listPending } = usePressReleaseListQuery();
  const { mutate: createNew, isPending: isCreating } = useCreatePressReleaseMutation();

  const [selectedId, setSelectedId] = useState<number | null>(getIdFromUrl);

  // URLのIDが記事一覧に存在しない場合はリセット
  useEffect(() => {
    if (listPending || articles.length === 0) return;
    const urlId = getIdFromUrl();
    if (urlId && !articles.some((a) => a.id === urlId)) {
      setSelectedId(null);
      setIdInUrl(null);
    }
  }, [listPending, articles]);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    setIdInUrl(id);
  };

  const handleBackToList = () => {
    setSelectedId(null);
    setIdInUrl(null);
  };

  const handleCreateNew = () => {
    createNew(undefined, {
      onSuccess: (created) => {
        setSelectedId(created.id);
        setIdInUrl(created.id);
      },
    });
  };

  return (
    <div className="appShell">
      <div className="appContent">
        {selectedId != null ? (
          <PageLoader
            key={selectedId}
            pressReleaseId={selectedId}
            articles={articles}
            selectedId={selectedId}
            onSelectArticle={handleSelect}
            onBackToList={handleBackToList}
            onCreateNew={handleCreateNew}
            isCreating={isCreating}
          />
        ) : (
          <ArticleListPage
            articles={articles}
            onSelect={handleSelect}
            onCreateNew={handleCreateNew}
            isCreating={isCreating}
          />
        )}
      </div>
    </div>
  );
}

type ArticleListProps = {
  articles: PressReleaseSummary[];
  selectedId: number | null;
  onSelectArticle: (id: number) => void;
  onBackToList: () => void;
  onCreateNew: () => void;
  isCreating: boolean;
};

function PageLoader({ pressReleaseId, articles, selectedId, onSelectArticle, onBackToList, onCreateNew, isCreating }: { pressReleaseId: number } & ArticleListProps) {
  const { data, isPending, isError } = usePressReleaseQuery(pressReleaseId);

  if (isPending || isError) return null;

  return (
    <Page
      pressReleaseId={pressReleaseId}
      title={data.title}
      content={JSON.parse(data.content)}
      tags={data.tags ?? []}
      articles={articles}
      selectedId={selectedId}
      onSelectArticle={onSelectArticle}
      onBackToList={onBackToList}
      onCreateNew={onCreateNew}
      isCreating={isCreating}
    />
  );
}

type PageProps = {
  pressReleaseId: number;
  title: string;
  content: string;
  tags: string[];
} & ArticleListProps;

function Page({ pressReleaseId, title: initialTitle, content, tags: initialTags, articles, selectedId, onSelectArticle, onBackToList, onCreateNew, isCreating }: PageProps) {
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

  const { isPending: isSaving, mutate: save } = useSavePressReleaseMutation(pressReleaseId);
  const { mutate: saveTags } = useSaveTagsMutation(pressReleaseId);
  const { data: tagItems = [] } = useTagSuggestQuery(tagQuery);

  const suggestions = tagItems.map((t) => ({ label: t.name, count: t.count }));

  const saveStatus = useAutoSave(editor ?? null, title, save);

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
        <div className="headerLeft">
          <button type="button" className="backButton" onClick={onBackToList}>
            ← 記事一覧
          </button>
          <h1 className="title">プレスリリースエディター</h1>
        </div>
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
            className={`saveButton saveButton--${saveStatus}`}
            disabled={isSaving}
            type="button"
          >
            {isSaving ? "保存中..." : saveStatus === "unsaved" ? "未保存" : saveStatus === "saving" ? "保存中..." : "保存"}
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
            articles={articles}
            selectedArticleId={selectedId}
            onSelectArticle={onSelectArticle}
            onCreateNew={onCreateNew}
            isCreating={isCreating}
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

            <div className="toolbarRow">
              <EditorToolbar editor={editor ?? null} />
              <ListLinkToolbar editor={editor ?? null} />
              <TemplateToolbar
                editor={editor ?? null}
                selectedTemplateIndex={selectedTemplateIndex}
                onSelectTemplate={setSelectedTemplateIndex}
              />
            </div>
            <ImageToolbar editor={editor ?? null} onSave={handleSave} />
            <LinkCardToolbar editor={editor ?? null} />
            <EditorContent editor={editor} />
          </div>

          <CommentSidebar editor={editor ?? null} pressReleaseId={pressReleaseId} onSave={handleSave} />
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