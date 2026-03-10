import { useState } from "react";
import "./WritingWorkflow.css";

const SECTIONS = [
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

export default function WritingWorkflow() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggleCheck = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const sectionProgress = (sectionIndex: number) => {
    const section = SECTIONS[sectionIndex];
    const done = section.items.filter((_, i) =>
      checked.has(`${sectionIndex}-${i}`),
    ).length;
    return { done, total: section.items.length };
  };

  const totalDone = checked.size;
  const totalItems = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

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
        <h3 className="workflowTitle">執筆チェックリスト</h3>
        <button
          className="workflowCloseButton"
          onClick={() => setIsOpen(false)}
        >
          &times;
        </button>
      </div>

      <div className="workflowProgress">
        <div className="workflowProgressBar">
          <div
            className="workflowProgressFill"
            style={{ width: `${(totalDone / totalItems) * 100}%` }}
          />
        </div>
        <span className="workflowProgressText">
          {totalDone} / {totalItems} 完了
        </span>
      </div>

      {SECTIONS.map((section, si) => {
        const { done, total } = sectionProgress(si);
        const isActive = activeSection === si;
        const isComplete = done === total;

        return (
          <div
            key={si}
            className={`workflowStep ${isComplete ? "stepCompleted" : ""} ${isActive ? "stepActive" : ""}`}
          >
            <div
              className="stepHeader"
              onClick={() => setActiveSection(si)}
            >
              <span className="stepNumber">{si + 1}</span>
              <div className="stepHeaderText">
                <span className="stepLabel">{section.title}</span>
                <span className="stepSubtitle">{section.subtitle}</span>
              </div>
              <span className="stepProgress">
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
                        checked={checked.has(key)}
                        onChange={() => toggleCheck(key)}
                      />
                      <div className="checklistContent">
                        <span
                          className={`checklistLabel ${checked.has(key) ? "checklistLabelDone" : ""}`}
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
