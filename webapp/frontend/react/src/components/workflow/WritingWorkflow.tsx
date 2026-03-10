import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { TEMPLATES, applyTemplate } from "../../templates";
import "./WritingWorkflow.css";

const CHECKLIST_SECTIONS = [
  {
    title: "企画の準備",
    subtitle: "Why / Who",
    items: [
      {
        label: "誰に届けたいか決めた？",
        hint: "例：業界専門誌の記者、地元の主婦層など",
      },
      {
        label: "「なぜ今なのか」を言える？",
        hint: "季節性、社会情勢、新発売など",
      },
      {
        label: "キーワードを3つ選んだ？",
        hint: "記事が検索で見つかりやすくなります",
      },
    ],
  },
  {
    title: "タイトル・画像",
    subtitle: "First View",
    items: [
      {
        label: "タイトルに「最大の強み」を入れた？",
        hint: "30文字以内で結論を前に",
      },
      {
        label: "メイン画像は設定した？",
        hint: "横向き・高画質のものがベスト",
      },
      {
        label: "サブ画像（グラフや利用シーン）はある？",
        hint: "3枚以上あると記事の説得力がUP",
      },
    ],
  },
  {
    title: "本文の構成",
    subtitle: "Body",
    items: [
      {
        label: "リード文で「5W1H」を網羅した？",
        hint: "最初の3行で全容がわかるように",
      },
      {
        label: "「開発の裏側・想い」を書いた？",
        hint: "中小企業ならではのストーリーは記者が好みます",
      },
      {
        label: "箇条書きを使っている？",
        hint: "スマホで読んでも疲れない工夫",
      },
    ],
  },
  {
    title: "信頼性と連絡先",
    subtitle: "Trust",
    items: [
      {
        label: "会社概要は最新？",
        hint: "代表者名や所在地、URLの確認",
      },
      {
        label: "メディア専用の問い合わせ先を入れた？",
        hint: "電話番号と担当者名",
      },
      {
        label: "プレビューでリンク切れを確認した？",
        hint: "",
      },
    ],
  },
] as const;

type Props = {
  editor: Editor | null;
  title: string;
  setTitle: (title: string) => void;
  onSave: () => void;
  selectedTemplateIndex: number | null;
  onSelectTemplate: (index: number) => void;
};

export default function WritingWorkflow({
  editor,
  title,
  setTitle,
  onSave,
  selectedTemplateIndex,
  onSelectTemplate,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [titleCandidates, setTitleCandidates] = useState<string[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // チェックリスト用state
  const [activeChecklist, setActiveChecklist] = useState<number | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

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

  const toggleCheckItem = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleApplyTemplate = () => {
    if (!editor || selectedTemplateIndex === null) return;

    if (
      !confirm(
        "テンプレートを適用すると、現在の本文が上書きされます。よろしいですか？",
      )
    ) {
      return;
    }

    applyTemplate(editor, selectedTemplateIndex);
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
          body: editor.getText(),
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      setTitleCandidates(data.titles ?? []);
    } catch {
      // API未実装の場合はダミーデータを表示
      setTitleCandidates([
        "当社の新たな取り組みに関する重要なお知らせ",
        `【プレスリリース】${new Date().getFullYear()}年の最新情報`,
        "事業拡大に向けた新たな一歩について",
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const applySelectedTitle = () => {
    if (selectedTitleIndex === null) return;
    setTitle(titleCandidates[selectedTitleIndex]);
  };

  const sectionProgress = (sectionIndex: number) => {
    const section = CHECKLIST_SECTIONS[sectionIndex];
    const done = section.items.filter((_, i) =>
      checkedItems.has(`${sectionIndex}-${i}`),
    ).length;
    return { done, total: section.items.length };
  };

  const totalCheckDone = checkedItems.size;
  const totalCheckItems = CHECKLIST_SECTIONS.reduce(
    (sum, s) => sum + s.items.length,
    0,
  );

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
        <button
          className="workflowCloseButton"
          onClick={() => setIsOpen(false)}
        >
          &times;
        </button>
      </div>

      {/* Step 1: キーワードを決める */}
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
            <p className="templateHint">
              テンプレートを選んで本文に適用できます。
            </p>
            <div className="templateList">
              {TEMPLATES.map((t, i) => (
                <label
                  key={i}
                  className={`templateOption ${selectedTemplateIndex === i ? "templateOptionSelected" : ""}`}
                  onClick={() => onSelectTemplate(i)}
                >
                  <input
                    type="radio"
                    name="workflowTemplate"
                    className="templateRadio"
                    checked={selectedTemplateIndex === i}
                    onChange={() => onSelectTemplate(i)}
                  />
                  <span>{t.name}</span>
                </label>
              ))}
            </div>
            <button
              className="applyTemplateButton"
              disabled={selectedTemplateIndex === null}
              onClick={handleApplyTemplate}
            >
              テンプレートを適用
            </button>
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

      {/* ── 執筆チェックリスト ── */}
      <div className="checklistDivider">
        <span className="checklistDividerText">執筆チェックリスト</span>
      </div>

      <div className="checklistProgress">
        <div className="checklistProgressBar">
          <div
            className="checklistProgressFill"
            style={{
              width: `${totalCheckItems > 0 ? (totalCheckDone / totalCheckItems) * 100 : 0}%`,
            }}
          />
        </div>
        <span className="checklistProgressText">
          {totalCheckDone} / {totalCheckItems} 完了
        </span>
      </div>

      {CHECKLIST_SECTIONS.map((section, si) => {
        const { done, total } = sectionProgress(si);
        const isActive = activeChecklist === si;
        const isComplete = done === total;

        return (
          <div
            key={si}
            className={`workflowStep ${isComplete ? "stepCompleted" : ""} ${isActive ? "stepActive" : ""}`}
          >
            <div
              className="stepHeader"
              onClick={() =>
                setActiveChecklist(isActive ? null : si)
              }
            >
              <span className="stepNumber">{si + 1}</span>
              <div className="checklistHeaderText">
                <span className="stepLabel">{section.title}</span>
                <span className="checklistSubtitle">{section.subtitle}</span>
              </div>
              <span className="checklistSectionProgress">
                {done}/{total}
              </span>
            </div>
            {isActive && (
              <div className="stepBody">
                {section.items.map((item, ii) => {
                  const key = `${si}-${ii}`;
                  return (
                    <label key={ii} className="checklistItem">
                      <input
                        type="checkbox"
                        className="checklistCheckbox"
                        checked={checkedItems.has(key)}
                        onChange={() => toggleCheckItem(key)}
                      />
                      <div className="checklistContent">
                        <span
                          className={`checklistLabel ${checkedItems.has(key) ? "checklistLabelDone" : ""}`}
                        >
                          {item.label}
                        </span>
                        {item.hint && (
                          <span className="checklistHint">{item.hint}</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
