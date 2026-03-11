import type { Editor } from "@tiptap/react";
import { useState } from "react";
import WritingWorkflow from "./WritingWorkflow";
import ChatBot from "../chat/ChatBot";
import { SNSPostPanel } from "../../features/sns-post";
import type { PressReleaseSummary } from "../../hooks/usePressRelease";
import "./LeftSidebar.css";

type ActiveTab = "articles" | "workflow" | "chat" | "sns";

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
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("workflow");

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
      </div>
    );
  }

  return (
    <div className="leftSidebar">
      <div className="leftSidebarHeader">
        <div className="leftSidebarTabs">
          <button
            className={`leftSidebarTab ${activeTab === "articles" ? "leftSidebarTabActive" : ""}`}
            onClick={() => setActiveTab("articles")}
          >
            記事一覧
          </button>
          <button
            className={`leftSidebarTab ${activeTab === "workflow" ? "leftSidebarTabActive" : ""}`}
            onClick={() => setActiveTab("workflow")}
          >
            執筆ガイド
          </button>
          <button
            className={`leftSidebarTab ${activeTab === "chat" ? "leftSidebarTabActive" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            AIチャット
          </button>
          <button
            className={`leftSidebarTab ${activeTab === "sns" ? "leftSidebarTabActive" : ""}`}
            onClick={() => setActiveTab("sns")}
          >
            SNS投稿
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
        {activeTab === "sns" ? (
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
