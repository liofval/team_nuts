import type { Editor } from "@tiptap/react";
import { useState } from "react";
import WritingWorkflow from "./WritingWorkflow";
import ChatBot from "../chat/ChatBot";
import "./LeftSidebar.css";

type ActiveTab = "workflow" | "chat";

type Props = {
  editor: Editor | null;
  title: string;
  setTitle: (title: string) => void;
  onSave: () => void;
  selectedTemplateIndex: number | null;
  onSelectTemplate: (index: number) => void;
};

export default function LeftSidebar({
  editor,
  title,
  setTitle,
  onSave,
  selectedTemplateIndex,
  onSelectTemplate,
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
        <button className="leftSidebarToggle leftSidebarToggleWorkflow" onClick={() => openTab("workflow")}>
          執筆ガイド
        </button>
        <button className="leftSidebarToggle leftSidebarToggleChat" onClick={() => openTab("chat")}>
          AIチャット
        </button>
      </div>
    );
  }

  return (
    <div className="leftSidebar">
      <div className="leftSidebarHeader">
        <div className="leftSidebarTabs">
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
        </div>
        <button
          className="leftSidebarClose"
          onClick={() => setIsOpen(false)}
        >
          &times;
        </button>
      </div>

      <div className={`leftSidebarBody ${activeTab === "chat" ? "leftSidebarBodyNoScroll" : ""}`}>
        {activeTab === "workflow" ? (
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
