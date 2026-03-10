import type { Editor } from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";
import type { Article } from "../../../shared/types/article";
import type { Tag } from "../../../shared/types/tag";
import { useReferenceSearch } from "../hooks/useReferenceSearch";
import { useTagSuggest } from "../hooks/useTagSuggest";
import "./referenceSearch.css";

const USE_MOCK_ITEMS =
  (import.meta.env.VITE_USE_MOCK_REFERENCE_ITEMS ?? "false").toString() === "true";

const MOCK_ITEMS: Article[] = [
  {
    id: 1,
    title: "AIを活用した新プロダクト発表",
    mainImageUrl: null,
    excerpt: "本文の先頭〜",
    publishedAt: "2026-02-20T08:00:00Z",
    tags: ["AI", "IT"],
    score: 1.87,
  },
  {
    id: 12,
    title: "IT業界の最新トレンドまとめ",
    mainImageUrl: null,
    excerpt: "最近の動向について〜",
    publishedAt: "2026-01-15T09:30:00Z",
    tags: ["IT"],
    score: 1.2,
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
};

export default function ReferenceSearchOverlay({ open, onClose, editor }: Props) {
  const {
    q,
    setQ,
    selectedTags,
    addTag,
    removeTag,
    tagInput,
    setTagInput,
    data,
    isPending,
    isError,
  } = useReferenceSearch({ limit: 8 });

  const items = useMemo(() => data ?? [], [data]);

  const [selected, setSelected] = useState<Article | null>(null);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

  const tagSuggest = useTagSuggest(tagInput, { limit: 10, enabled: open });

  const tagCandidates = useMemo(() => {
    const raw = tagSuggest.data ?? [];
    // 既に選択済みのタグは候補から除外
    const selectedIds = new Set(selectedTags.map((t) => t.id));
    return raw.filter((t) => !selectedIds.has(t.id));
  }, [tagSuggest.data, selectedTags]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selected) setSelected(null);
      else onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, selected]);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setTagDropdownOpen(false);
    }
  }, [open]);

  if (!open) return null;

  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const insertAsReference = (a: Article) => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .insertContent(
        `<p style="border-left:3px solid #c94f2a;padding-left:12px;margin:16px 0;color:#8a8478;font-size:13px">
          📎 参考：${escapeHtml(a.title)}（${escapeHtml(formatDate(a.publishedAt))}）
        </p>`
      )
      .run();

    onClose();
  };

  const selectTagFromDropdown = (t: Tag) => {
    addTag(t);
    setTagDropdownOpen(false);
  };

  return (
    <>
      <div className="search-overlay active" onMouseDown={handleOverlayMouseDown}>
        <div className="search-panel" onMouseDown={(e) => e.stopPropagation()}>
          <div className="search-header-area">
            {/* Row 1: keyword */}
            <div className="search-kw-row">
              <span className="search-icon">🔍</span>
              <input
                className="search-kw-input"
                placeholder="キーワード・書きたい内容で検索..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
              />
              <button className="search-close-btn" onClick={onClose}>
                ESC で閉じる
              </button>
            </div>

            {/* Row 2: tag filter */}
            <div className="search-tag-section">
              <span className="search-tag-label">タグで絞り込む</span>

              <div
                className="search-tag-box"
                onMouseDown={() => setTagDropdownOpen(true)}
              >
                {selectedTags.map((t) => (
                  <span key={t.id} className="filter-pill">
                    {t.name}
                    <button
                      className="filter-pill-remove"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        removeTag(t.id);
                      }}
                      aria-label={`${t.name} を削除`}
                    >
                      ×
                    </button>
                  </span>
                ))}

                <input
                  className="search-tag-input"
                  placeholder="タグ名を入力して候補から選択..."
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setTagDropdownOpen(true);
                  }}
                  onFocus={() => setTagDropdownOpen(true)}
                  onBlur={() => {
                    // mousedown で選べるよう、遅延して閉じる
                    window.setTimeout(() => setTagDropdownOpen(false), 150);
                  }}
                />
              </div>

              {/* dropdown */}
              {tagDropdownOpen && tagInput.trim().length > 0 && (
                <div className={`search-tag-suggestions show`}>
                  {tagSuggest.isPending && (
                    <div className="sts-item">検索中...</div>
                  )}

                  {!tagSuggest.isPending && tagCandidates.length === 0 && (
                    <div className="sts-item">候補がありません</div>
                  )}

                  {tagCandidates.map((t) => (
                    <div
                      key={t.id}
                      className="sts-item"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectTagFromDropdown(t);
                      }}
                    >
                      <span>{t.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="search-results-area">
            <div className="results-meta">
              <strong>
                {isPending ? "検索中..." : isError ? "エラー" : `${items.length}件`}
              </strong>

              {selectedTags.length > 0 &&
                selectedTags.map((t) => (
                  <span key={t.id} className="filter-tag-badge">
                    {t.name}
                  </span>
                ))}
            </div>

            <div className="results-grid">
              {!isPending && items.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <p className="empty-text">
                    一致する記事が見つかりませんでした。<br />
                    別のキーワードやタグをお試しください。
                  </p>
                </div>
              )}

              {items.map((a) => (
                <div
                  key={a.id}
                  className="result-card"
                  onClick={() => setSelected(a)}
                >
                  <div className="result-img-placeholder">
                    {a.mainImageUrl ? (
                      <img
                        src={a.mainImageUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      "📰"
                    )}
                  </div>

                  <div className="result-body">
                    <div className="result-tags">
                      {(a.tags ?? []).slice(0, 3).map((t) => (
                        <span key={t} className="result-tag">
                          {t}
                        </span>
                      ))}
                      {typeof a.score === "number" && (
                        <span className="result-tag" style={{ marginLeft: "auto" }}>
                          score {a.score.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="result-title">{a.title}</div>
                    <div className="result-excerpt">{a.excerpt}</div>

                    <div className="result-footer">
                      <span className="result-date">{formatDate(a.publishedAt)}</span>
                      <button
                        className="result-use-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          insertAsReference(a);
                        }}
                      >
                        参考に使う
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 人気タグは仕様が来たら PopularTagsSection で追加 */}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div className={`detail-panel ${selected ? "active" : ""}`}>
        {selected && (
          <>
            <div className="detail-header">
              <span className="detail-label">参考記事 — 詳細</span>
              <button className="detail-close-btn" onClick={() => setSelected(null)}>
                閉じる
              </button>
            </div>

            <div className="detail-content">
              <div className="detail-img-ph">
                {selected.mainImageUrl ? (
                  <img
                    src={selected.mainImageUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  "📰"
                )}
              </div>

              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                {selected.tags.map((t) => (
                  <span key={t} className="result-tag">
                    {t}
                  </span>
                ))}
              </div>

              <div className="detail-title">{selected.title}</div>
              <div className="detail-meta">
                <span>{formatDate(selected.publishedAt)}</span>
                {typeof selected.score === "number" && <span>score: {selected.score.toFixed(2)}</span>}
              </div>

              {/* body APIが無いので excerpt を表示（本文取得APIが来たら差し替え） */}
              <div className="detail-body-text">{selected.excerpt}</div>
            </div>

            <div className="detail-actions">
              <button className="btn btn-ghost" onClick={() => insertAsReference(selected)}>
                参考として挿入
              </button>
              <button className="btn btn-primary" onClick={onClose}>
                閉じる
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function formatDate(v: string) {
  return v?.slice(0, 10) ?? "";
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}