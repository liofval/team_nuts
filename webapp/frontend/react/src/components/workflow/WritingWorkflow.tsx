import type { Editor } from "@tiptap/react";
import { useState } from "react";
import "./WritingWorkflow.css";

const KEYWORDS = [
  "#新製品",
  "#サービス開始",
  "#提携",
  "#受賞",
  "#イベント",
  "#採用",
  "#決算",
] as const;

type Keyword = (typeof KEYWORDS)[number];

const KEYWORD_TEMPLATES: Record<Keyword, string> = {
  "#新製品": `【新製品に関するプレスリリース】

■ リード文
[会社名]は、[日付]に[新製品名]を発売することをお知らせいたします。

■ 製品概要
・製品名：
・発売日：
・価格：
・特長：

■ 開発背景

■ 製品の詳細

■ お問い合わせ先`,
  "#サービス開始": `【新サービス開始に関するプレスリリース】

■ リード文
[会社名]は、[日付]より[サービス名]の提供を開始いたします。

■ サービス概要
・サービス名：
・提供開始日：
・対象：
・料金：

■ サービス開始の背景

■ サービスの特長

■ お問い合わせ先`,
  "#提携": `【業務提携に関するプレスリリース】

■ リード文
[会社名]は、[提携先]と[提携内容]に関する業務提携契約を締結いたしました。

■ 提携の概要
・提携先：
・提携内容：
・開始時期：

■ 提携の背景と目的

■ 今後の展開

■ お問い合わせ先`,
  "#受賞": `【受賞に関するプレスリリース】

■ リード文
[会社名]の[対象]が、[賞名]を受賞いたしました。

■ 受賞概要
・賞名：
・受賞対象：
・授賞理由：

■ 受賞の背景

■ 今後の展望

■ お問い合わせ先`,
  "#イベント": `【イベント開催に関するプレスリリース】

■ リード文
[会社名]は、[日付]に[イベント名]を開催いたします。

■ イベント概要
・イベント名：
・開催日時：
・会場：
・参加費：
・定員：

■ イベントの内容

■ 参加申込方法

■ お問い合わせ先`,
  "#採用": `【採用に関するプレスリリース】

■ リード文
[会社名]は、[役職・分野]の採用を強化いたします。

■ 採用概要
・募集職種：
・募集人数：
・勤務地：
・応募期間：

■ 採用強化の背景

■ 求める人材像

■ お問い合わせ先`,
  "#決算": `【決算に関するプレスリリース】

■ リード文
[会社名]は、[期間]の決算を発表いたします。

■ 決算ハイライト
・売上高：
・営業利益：
・経常利益：
・純利益：

■ 事業の概況

■ 今後の見通し

■ お問い合わせ先`,
};

type Props = {
  editor: Editor | null;
  title: string;
  setTitle: (title: string) => void;
  onSave: () => void;
};

export default function WritingWorkflow({
  editor,
  title,
  setTitle,
  onSave,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [selectedKeywords, setSelectedKeywords] = useState<Keyword[]>([]);
  const [titleCandidates, setTitleCandidates] = useState<string[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleKeyword = (keyword: Keyword) => {
    setSelectedKeywords((prev) =>
      prev.includes(keyword)
        ? prev.filter((k) => k !== keyword)
        : [...prev, keyword],
    );
  };

  const toggleStep = (step: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(step)) {
        next.delete(step);
      } else {
        next.add(step);
      }
      return next;
    });
  };

  const applyTemplate = () => {
    if (!editor || selectedKeywords.length === 0) return;

    const templates = selectedKeywords.map((kw) => KEYWORD_TEMPLATES[kw]);
    const combined = templates.join("\n\n---\n\n");

    if (
      !confirm("テンプレートを適用すると、現在の本文が上書きされます。よろしいですか？")
    ) {
      return;
    }

    editor.commands.setContent(`<p>${combined.replace(/\n/g, "<br>")}</p>`);
  };

  const generateTitles = async () => {
    if (!editor) return;

    setIsGenerating(true);
    setTitleCandidates([]);
    setSelectedTitleIndex(null);

    try {
      const res = await fetch("/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: selectedKeywords,
          body: editor.getText(),
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      setTitleCandidates(data.titles ?? []);
    } catch {
      // API未実装の場合はダミーデータを表示
      const keywordText = selectedKeywords.join("・");
      setTitleCandidates([
        `${keywordText}に関する重要なお知らせ`,
        `【${selectedKeywords[0] ?? ""}】当社の新たな取り組みについて`,
        `${keywordText}｜${new Date().getFullYear()}年の最新情報`,
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const applySelectedTitle = () => {
    if (selectedTitleIndex === null) return;
    setTitle(titleCandidates[selectedTitleIndex]);
  };

  if (!isOpen) {
    return (
      <button className="workflowToggleButton" onClick={() => setIsOpen(true)}>
        執筆ガイド
      </button>
    );
  }

  return (
    <div className="workflowSidebar">
      <div className="workflowHeader">
        <h3 className="workflowTitle">執筆ワークフロー</h3>
        <button className="workflowCloseButton" onClick={() => setIsOpen(false)}>
          &times;
        </button>
      </div>

      {/* Step 1: キーワード選択 */}
      <div
        className={`workflowStep ${completedSteps.has(1) ? "stepCompleted" : ""} ${activeStep === 1 ? "stepActive" : ""}`}
      >
        <div className="stepHeader" onClick={() => setActiveStep(1)}>
          <input
            type="checkbox"
            className="stepCheckbox"
            checked={completedSteps.has(1)}
            onChange={() => toggleStep(1)}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="stepNumber">1</span>
          <span className="stepLabel">キーワードを決める</span>
        </div>
        {activeStep === 1 && (
          <div className="stepBody">
            <div className="keywordChips">
              {KEYWORDS.map((kw) => (
                <button
                  key={kw}
                  className={`keywordChip ${selectedKeywords.includes(kw) ? "chipSelected" : ""}`}
                  onClick={() => toggleKeyword(kw)}
                >
                  {kw}
                </button>
              ))}
            </div>
            <div className="stepNav">
              <button
                className="stepNavButton"
                disabled={selectedKeywords.length === 0}
                onClick={() => {
                  if (!completedSteps.has(1)) toggleStep(1);
                  setActiveStep(2);
                }}
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: 本文を書く */}
      <div
        className={`workflowStep ${completedSteps.has(2) ? "stepCompleted" : ""} ${activeStep === 2 ? "stepActive" : ""}`}
      >
        <div className="stepHeader" onClick={() => setActiveStep(2)}>
          <input
            type="checkbox"
            className="stepCheckbox"
            checked={completedSteps.has(2)}
            onChange={() => toggleStep(2)}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="stepNumber">2</span>
          <span className="stepLabel">本文を書く</span>
        </div>
        {activeStep === 2 && (
          <div className="stepBody">
            {selectedKeywords.length > 0 && (
              <>
                <div className="templateSuggestion">
                  選択キーワード: {selectedKeywords.join(", ")}
                  {"\n"}テンプレートを適用してから本文を編集できます。
                </div>
                <button className="applyTemplateButton" onClick={applyTemplate}>
                  テンプレートを適用
                </button>
              </>
            )}
            <div className="stepNav">
              <button
                className="stepNavButton"
                onClick={() => {
                  if (!completedSteps.has(2)) toggleStep(2);
                  setActiveStep(3);
                }}
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step 3: AIタイトル生成 */}
      <div
        className={`workflowStep ${completedSteps.has(3) ? "stepCompleted" : ""} ${activeStep === 3 ? "stepActive" : ""}`}
      >
        <div className="stepHeader" onClick={() => setActiveStep(3)}>
          <input
            type="checkbox"
            className="stepCheckbox"
            checked={completedSteps.has(3)}
            onChange={() => toggleStep(3)}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="stepNumber">3</span>
          <span className="stepLabel">タイトルをAIで生成</span>
        </div>
        {activeStep === 3 && (
          <div className="stepBody">
            <button
              className="generateTitleButton"
              onClick={generateTitles}
              disabled={isGenerating}
            >
              {isGenerating ? "生成中..." : "タイトルを生成"}
            </button>

            {isGenerating && (
              <p className="generatingText">AIがタイトルを考えています...</p>
            )}

            {titleCandidates.length > 0 && (
              <>
                <div className="titleCandidates">
                  {titleCandidates.map((candidate, i) => (
                    <label
                      key={i}
                      className={`titleCandidate ${selectedTitleIndex === i ? "candidateSelected" : ""}`}
                      onClick={() => setSelectedTitleIndex(i)}
                    >
                      <input
                        type="radio"
                        name="titleCandidate"
                        className="titleCandidateRadio"
                        checked={selectedTitleIndex === i}
                        onChange={() => setSelectedTitleIndex(i)}
                      />
                      <span>{candidate}</span>
                    </label>
                  ))}
                </div>
                <button
                  className="applyTitleButton"
                  disabled={selectedTitleIndex === null}
                  onClick={() => {
                    applySelectedTitle();
                    if (!completedSteps.has(3)) toggleStep(3);
                    setActiveStep(4);
                  }}
                >
                  タイトルを適用して次へ
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Step 4: 確認して保存 */}
      <div
        className={`workflowStep ${completedSteps.has(4) ? "stepCompleted" : ""} ${activeStep === 4 ? "stepActive" : ""}`}
      >
        <div className="stepHeader" onClick={() => setActiveStep(4)}>
          <input
            type="checkbox"
            className="stepCheckbox"
            checked={completedSteps.has(4)}
            onChange={() => toggleStep(4)}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="stepNumber">4</span>
          <span className="stepLabel">確認して保存</span>
        </div>
        {activeStep === 4 && (
          <div className="stepBody">
            <div className="reviewSection">
              <div className="reviewItem">
                <span className="reviewLabel">キーワード</span>
                <div className="reviewKeywords">
                  {selectedKeywords.length > 0 ? (
                    selectedKeywords.map((kw) => (
                      <span key={kw} className="reviewKeywordTag">
                        {kw}
                      </span>
                    ))
                  ) : (
                    <span className="reviewValue">未選択</span>
                  )}
                </div>
              </div>
              <div className="reviewItem">
                <span className="reviewLabel">タイトル</span>
                <div className="reviewValue">{title || "未入力"}</div>
              </div>
              <div className="reviewItem">
                <span className="reviewLabel">本文</span>
                <div className="reviewValue">
                  {editor
                    ? `${editor.getText().slice(0, 100)}${editor.getText().length > 100 ? "..." : ""}`
                    : "未入力"}
                </div>
              </div>
            </div>
            <button className="saveWorkflowButton" onClick={onSave}>
              保存する
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
