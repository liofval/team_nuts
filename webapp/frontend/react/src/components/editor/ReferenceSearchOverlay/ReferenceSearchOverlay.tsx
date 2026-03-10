// src/components/editor/ReferenceSearchOverlay/ReferenceSearchOverlay.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ReferenceSearchOverlay.module.css";
import { useTagSuggest } from "../../../hooks/useTagSuggest";
import { useReferenceSearch } from "../../../hooks/useReferenceSearch";
import type { TagItem } from "../../../types/reference";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ReferenceSearchOverlay({ open, onClose }: Props) {
  const [kw, setKw] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<TagItem[]>([]);
  const [focusIdx, setFocusIdx] = useState(-1);

  const { items: suggestItems, fetchSuggest } = useTagSuggest();
  const { data, loading, error, search } = useReferenceSearch();

  const kwInputRef = useRef<HTMLInputElement | null>(null);

  const tagIds = useMemo(() => selectedTags.map((t) => t.id), [selectedTags]);

  const filteredSuggest = useMemo(() => {
    return suggestItems.filter((t) => !selectedTags.some((s) => s.id === t.id));
  }, [suggestItems, selectedTags]);

  // open時の初期化（人気タグ + 初回検索）
  useEffect(() => {
    if (!open) return;

    // 初回だけ初期状態に戻したいならコメントアウトを外す
    // setKw("");
    // setTagQuery("");
    // setSelectedTags([]);
    // setFocusIdx(-1);

    fetchSuggest("", 10);
    search({ q: "", tagIds: [], page: 1, perPage: 12 });

    // フォーカス
    setTimeout(() => kwInputRef.current?.focus(), 0);
  }, [open, fetchSuggest, search]);

  // ESCで閉じる
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // キーワード検索（デバウンス）
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      search({ q: kw, tagIds, page: 1, perPage: 12 });
    }, 200);
    return () => clearTimeout(t);
  }, [kw, tagIds, open, search]);

  // タグ候補取得（デバウンス）
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      fetchSuggest(tagQuery.trim(), 10);
    }, 150);
    return () => clearTimeout(t);
  }, [tagQuery, open, fetchSuggest]);

  const addTag = (tag: TagItem) => {
    if (selectedTags.some((t) => t.id === tag.id)) return;
    setSelectedTags((prev) => [...prev, tag]);
    setTagQuery("");
    setFocusIdx(-1);
  };

  const removeTag = (id: number) => {
    setSelectedTags((prev) => prev.filter((t) => t.id !== id));
    setFocusIdx(-1);
  };

  // タグ入力キー操作
  const onTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((v) => Math.min(v + 1, filteredSuggest.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((v) => Math.max(v - 1, -1));
    } else if (e.key === "Enter") {
      if (focusIdx >= 0 && filteredSuggest[focusIdx]) {
        e.preventDefault();
        addTag(filteredSuggest[focusIdx]);
      }
    } else if (e.key === "Backspace") {
      if (tagQuery === "" && selectedTags.length > 0) {
        removeTag(selectedTags[selectedTags.length - 1].id);
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.panel}>
        {/* header */}
        <div className={styles.header}>
          <input
            ref={kwInputRef}
            className={styles.kwInput}
            placeholder="キーワード・書きたい内容で検索..."
            value={kw}
            onChange={(e) => setKw(e.target.value)}
          />
          <button className={styles.closeBtn} onClick={onClose}>
            ESCで閉じる
          </button>
        </div>

        {/* tag filter */}
        <div className={styles.tagSection}>
          <div className={styles.tagLabel}>タグで絞り込む</div>

          <div
            className={styles.tagBox}
            onMouseDown={() => document.getElementById("refTagInput")?.focus()}
          >
            {selectedTags.map((t) => (
              <button
                key={t.id}
                className={styles.tagPill}
                onMouseDown={(e) => e.preventDefault()} // blur防止
                onClick={() => removeTag(t.id)}
                title="クリックで解除"
              >
                {t.name} <span className={styles.pillX}>×</span>
              </button>
            ))}

            <input
              id="refTagInput"
              className={styles.tagInput}
              placeholder="タグを選択..."
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              onKeyDown={onTagKeyDown}
            />
          </div>

          {filteredSuggest.length > 0 && (
            <div className={styles.suggest}>
              {filteredSuggest.slice(0, 10).map((t, i) => (
                <div
                  key={t.id}
                  className={`${styles.suggestItem} ${i === focusIdx ? styles.focused : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // blur防止
                    addTag(t);
                  }}
                >
                  <span>{t.name}</span>
                  <span className={styles.count}>{t.count}件</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* meta */}
        <div className={styles.meta}>
          <strong>{loading ? "検索中..." : `${data?.total ?? 0}件`}</strong>
          {selectedTags.map((t) => (
            <span key={t.id} className={styles.metaTag}>
              {t.name}
            </span>
          ))}
          {error && <span className={styles.error}>({error})</span>}
        </div>

        {/* results */}
        <div className={styles.grid}>
          {(data?.items ?? []).map((a) => (
            <div key={a.id} className={styles.card}>
              <div className={styles.thumb}>
                {a.main_image_url ? (
                  <img className={styles.thumbImg} src={a.main_image_url} alt="" />
                ) : (
                  <div className={styles.thumbPlaceholder} />
                )}
              </div>

              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>{a.title}</div>
                <div className={styles.cardExcerpt}>{a.excerpt}</div>

                <div className={styles.cardFooter}>
                  <span className={styles.date}>
                    {a.published_at ? new Date(a.published_at).toLocaleDateString() : ""}
                  </span>

                  {/* 参考に使うボタンは無し */}
                </div>
              </div>
            </div>
          ))}

          {!loading && (data?.items?.length ?? 0) === 0 && (
            <div className={styles.empty}>一致する記事が見つかりませんでした</div>
          )}
        </div>
      </div>
    </div>
  );
}