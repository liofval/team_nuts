import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { BASE_URL } from "../../constants";
import { TEMPLATES, applyTemplate } from "../../templates";
import {
  useTemplatesQuery,
  useCreateTemplateMutation,
} from "../../hooks/useTemplate";
import "./WritingWorkflow.css";

type TitleCandidate = {
  title: string;
  type: string;
  description: string;
};

const DUMMY_TITLE_CANDIDATES: TitleCandidate[] = [
  {
    title: "当社の新サービス開始に関するお知らせ",
    type: "王道・ニュース型",
    description: "最もオーソドックスな形式で、事実を端的に伝えます。メディアが引用しやすい構成です。",
  },
  {
    title: "「○○の課題」を解決する新サービスを本日より提供開始",
    type: "課題解決型",
    description: "ターゲットが抱える課題を冒頭に置き、解決策として自社サービスを提示します。",
  },
  {
    title: "創業から10年、町工場の挑戦が生んだ新サービスの全貌",
    type: "ストーリー型",
    description: "開発の背景や想いをストーリーとして伝え、読者の共感を引き出します。",
  },
  {
    title: "2025年注目のDXトレンドに対応した新サービスを発表",
    type: "トレンド型",
    description: "業界のトレンドやキーワードと結びつけて、時流に乗った印象を与えます。",
  },
  {
    title: "導入企業の業務時間を50%削減した新サービスを一般公開",
    type: "インパクト型",
    description: "具体的な数値や成果を前面に出し、インパクトのある印象を与えます。",
  },
];

const CHECKLIST_SECTIONS = [
  {
    title: "企画の準備",
    subtitle: "Why / Who",
    items: [
      {
        label: "誰に届けたいか決めましたか？",
        hint: "例：業界専門誌の記者、地元の主婦層など",
      },
      {
        label: "「なぜ今なのか」を説明できますか？",
        hint: "季節性、社会情勢、新発売など",
      },
      {
        label: "キーワードを3つ選びましたか？",
        hint: "記事が検索で見つかりやすくなります",
      },
    ],
  },
  {
    title: "タイトル・画像",
    subtitle: "First View",
    items: [
      {
        label: "タイトルに「最大の強み」を入れましたか？",
        hint: "30文字以内で結論を前にお書きください",
      },
      {
        label: "メイン画像は設定しましたか？",
        hint: "横向き・高画質のものがおすすめです",
      },
      {
        label: "サブ画像（グラフや利用シーン）はありますか？",
        hint: "3枚以上あると記事の説得力が高まります",
      },
    ],
  },
  {
    title: "本文の構成",
    subtitle: "Body",
    items: [
      {
        label: "リード文で「5W1H」を網羅しましたか？",
        hint: "最初の3行で全容がわかるようにしましょう",
      },
      {
        label: "「開発の裏側・想い」を書きましたか？",
        hint: "中小企業ならではのストーリーは記者に好まれます",
      },
      {
        label: "箇条書きを使っていますか？",
        hint: "スマホでも読みやすくなる工夫です",
      },
    ],
  },
  {
    title: "信頼性と連絡先",
    subtitle: "Trust",
    items: [
      {
        label: "会社概要は最新ですか？",
        hint: "代表者名や所在地、URLをご確認ください",
      },
      {
        label: "メディア専用の問い合わせ先を入れましたか？",
        hint: "電話番号と担当者名をご記載ください",
      },
      {
        label: "プレビューでリンク切れを確認しましたか？",
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
  const { data: templates } = useTemplatesQuery();
  const createRecruitMutation = useCreateTemplateMutation();
  const recruitTemplate = templates?.find((t) => t.name === "recruit");

  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [titleCandidates, setTitleCandidates] = useState<TitleCandidate[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetAudience, setTargetAudience] = useState("");

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

  const handleInsertRecruit = () => {
    if (!editor || !recruitTemplate) return;
    const html = recruitTemplate.content
      .split("\n\n")
      .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
      .join("");
    editor.commands.focus("end");
    editor.commands.insertContent(html);
  };

  const handleCreateRecruit = () => {
    createRecruitMutation.mutate({
      name: "recruit",
      title: "リクルート",
      content: "■ 採用情報\n私たちは一緒に働く仲間を募集しています。\n\n■ 募集職種\n・[職種1]\n・[職種2]\n\n■ 応募方法\n採用ページよりご応募ください。\nURL：[採用ページURL]\n\n■ お問い合わせ\n[会社名] 採用担当\nEmail：[メールアドレス]",
    });
  };

  const handleApplyTemplate = () => {
    if (!editor || selectedTemplateIndex === null) return;

    if (
      !confirm(
        "テンプレートを適用すると、現在の本文が上書きされます。よろしいでしょうか？",
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
      const res = await fetch(`${BASE_URL}/generate-title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: editor.getText(),
          target_audience: targetAudience,
          tags: [],
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      setTitleCandidates(data.titles ?? []);
    } catch {
      // API未実装の場合はダミーデータを表示
      setTitleCandidates(DUMMY_TITLE_CANDIDATES);
    } finally {
      setIsGenerating(false);
    }
  };

  const applySelectedTitle = () => {
    if (selectedTitleIndex === null) return;
    setTitle(titleCandidates[selectedTitleIndex].title);
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

  return (
    <div className="workflowContent">
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
          <span className="stepLabel">キーワードを決めましょう</span>
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
          <span className="stepLabel">本文を書きましょう</span>
        </div>
        {activeStep === 2 && (
          <div className="stepBody">
            <p className="templateHint">
              テンプレートを選んで本文に適用いただけます。
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
              テンプレートを適用する
            </button>
            <div className="recruitWorkflowSection">
              <p className="templateHint">
                リクルート情報を末尾に追加できます。
              </p>
              {recruitTemplate ? (
                <button
                  className="applyTemplateButton recruitInsertButton"
                  onClick={handleInsertRecruit}
                >
                  リクルート情報を挿入
                </button>
              ) : (
                <button
                  className="applyTemplateButton"
                  onClick={handleCreateRecruit}
                  disabled={createRecruitMutation.isPending}
                >
                  {createRecruitMutation.isPending
                    ? "作成中..."
                    : "リクルートテンプレートを作成"}
                </button>
              )}
            </div>
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
          <span className="stepLabel">タイトルをAIで生成しましょう</span>
        </div>
        {activeStep === 3 && (
          <div className="stepBody">
            <div className="targetAudienceField">
              <label className="targetAudienceLabel">ターゲット読者</label>
              <input
                type="text"
                className="targetAudienceInput"
                placeholder="例：業界専門誌の記者、地元の主婦層"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>
            <button
              className="generateTitleButton"
              onClick={generateTitles}
              disabled={isGenerating}
            >
              {isGenerating ? "生成中です..." : "AIでタイトルを生成する"}
            </button>

            {isGenerating && (
              <p className="generatingText">AIがタイトル候補を作成しております...</p>
            )}

            {titleCandidates.length > 0 && (
              <>
                <p className="titleCandidatesHint">候補からタイトルを選択してください</p>
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
                      <div className="titleCandidateContent">
                        <span className="titleCandidateType">{candidate.type}</span>
                        <span className="titleCandidateTitle">{candidate.title}</span>
                        <span className="titleCandidateDesc">{candidate.description}</span>
                      </div>
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
                  このタイトルを適用して次へ進む
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
          <span className="stepLabel">確認して保存しましょう</span>
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
