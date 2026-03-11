import type { Editor } from "@tiptap/react";
import { useState, useRef, useCallback, useEffect } from "react";
import WritingWorkflow from "./WritingWorkflow";
import ChatBot from "../chat/ChatBot";
import { SNSPostPanel } from "../../features/sns-post";
import { SettingsPanel } from "../../features/settings";
import type { PressReleaseSummary } from "../../hooks/usePressRelease";
import "./LeftSidebar.css";

type ActiveTab = "articles" | "workflow" | "chat" | "sns" | "settings";

type Props = {
  editor: Editor | null;
  title: string;
  setTitle: (title: string) => void;
  onSave: () => void;
  selectedTemplateIndex: number | null;
  onSelectTemplate: (index: number) => void;
  articles: PressReleaseSummary[];
  selectedArticleId: number | null;
  onSelectArticle: (id: number) => void;
  onCreateNew: () => void;
  isCreating: boolean;
  pressReleaseId: number;
  bodyText: string;
};

export default function LeftSidebar({
  editor,
  title,
  setTitle,
  onSave,
  selectedTemplateIndex,
  onSelectTemplate,
  articles,
  selectedArticleId,
  onSelectArticle,
  onCreateNew,
  isCreating,
  pressReleaseId,
  bodyText,
}: Props) {
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 600;
  const DEFAULT_WIDTH = 280;

  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [activeTab, setActiveTab] = useState<ActiveTab>("workflow");
  const tabsRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const scrollToTab = useCallback((el: HTMLButtonElement | null) => {
    if (el && tabsRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const newWidth = e.clientX;
    setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const switchTab = (tab: ActiveTab) => {
    setActiveTab(tab);
  };

  const openTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsOpen(true);
  };

  if (!isOpen) {
    return (
      <div className="leftSidebarToggles">
        <button className="leftSidebarToggle leftSidebarToggleArticles" onClick={() => openTab("articles")}>
          記事一覧
        </button>
        <button className="leftSidebarToggle leftSidebarToggleWorkflow" onClick={() => openTab("workflow")}>
          執筆ガイド
        </button>
        <button className="leftSidebarToggle leftSidebarToggleChat" onClick={() => openTab("chat")}>
          AIチャット
        </button>
        <button className="leftSidebarToggle leftSidebarToggleSns" onClick={() => openTab("sns")}>
          SNS投稿
        </button>
        <button className="leftSidebarToggle leftSidebarToggleSettings" onClick={() => openTab("settings")}>
          設定
        </button>
      </div>
    );
  }

  return (
    <div className="leftSidebar" style={{ width }}>
      <div className="leftSidebarResizeHandle" onMouseDown={handleDragStart} />
      <div className="leftSidebarHeader">
        <div className="leftSidebarTabs" ref={tabsRef}>
          <button
            ref={activeTab === "articles" ? scrollToTab : undefined}
            className={`leftSidebarTab ${activeTab === "articles" ? "leftSidebarTabActive" : ""}`}
            onClick={() => switchTab("articles")}
          >
            記事一覧
          </button>
          <button
            ref={activeTab === "workflow" ? scrollToTab : undefined}
            className={`leftSidebarTab ${activeTab === "workflow" ? "leftSidebarTabActive" : ""}`}
            onClick={() => switchTab("workflow")}
          >
            執筆ガイド
          </button>
          <button
            ref={activeTab === "chat" ? scrollToTab : undefined}
            className={`leftSidebarTab ${activeTab === "chat" ? "leftSidebarTabActive" : ""}`}
            onClick={() => switchTab("chat")}
          >
            AIチャット
          </button>
          <button
            ref={activeTab === "sns" ? scrollToTab : undefined}
            className={`leftSidebarTab ${activeTab === "sns" ? "leftSidebarTabActive" : ""}`}
            onClick={() => switchTab("sns")}
          >
            SNS投稿
          </button>
          <button
            ref={activeTab === "settings" ? scrollToTab : undefined}
            className={`leftSidebarTab ${activeTab === "settings" ? "leftSidebarTabActive" : ""}`}
            onClick={() => switchTab("settings")}
          >
            設定
          </button>
        </div>
        <button
          className="leftSidebarClose"
          onClick={() => setIsOpen(false)}
        >
          &times;
        </button>
      </div>

      <div className={`leftSidebarBody ${activeTab === "chat" || activeTab === "articles" ? "leftSidebarBodyNoScroll" : ""}`}>
        {activeTab === "settings" ? (
          <SettingsPanel />
        ) : activeTab === "sns" ? (
          <SNSPostPanel
            pressReleaseId={pressReleaseId}
            title={title}
            bodyText={bodyText}
          />
        ) : activeTab === "articles" ? (
          <div className="articlePanel">
            <div className="articlePanelHeader">
              <button
                type="button"
                className="articlePanelCreateBtn"
                onClick={onCreateNew}
                disabled={isCreating}
              >
                {isCreating ? "作成中..." : "＋ 新規作成"}
              </button>
            </div>
            <ul className="articlePanelList">
              {articles.map((a) => (
                <li
                  key={a.id}
                  className={`articlePanelItem ${a.id === selectedArticleId ? "articlePanelItemActive" : ""}`}
                  onClick={() => onSelectArticle(a.id)}
                >
                  <span className="articlePanelItemTitle">{a.title || "(タイトルなし)"}</span>
                  <span className="articlePanelItemDate">
                    {new Date(a.updated_at).toLocaleDateString("ja-JP")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : activeTab === "workflow" ? (
          <WritingWorkflow
            editor={editor}
            title={title}
            setTitle={setTitle}
            onSave={onSave}
            selectedTemplateIndex={selectedTemplateIndex}
            onSelectTemplate={onSelectTemplate}
          />
        ) : (
          <ChatBot editor={editor} />
        )}
      </div>
    </div>
  );
}
