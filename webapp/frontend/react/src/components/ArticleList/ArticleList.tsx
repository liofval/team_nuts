import type { PressReleaseSummary } from "../../hooks/usePressRelease";
import styles from "./ArticleList.module.css";

type Props = {
  articles: PressReleaseSummary[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onCreateNew: () => void;
  isCreating: boolean;
};

export default function ArticleList({
  articles,
  selectedId,
  onSelect,
  onCreateNew,
  isCreating,
}: Props) {
  return (
    <div className={styles.articleList}>
      <div className={styles.listHeader}>
        <span className={styles.listTitle}>記事一覧</span>
        <button
          type="button"
          className={styles.createButton}
          onClick={onCreateNew}
          disabled={isCreating}
        >
          {isCreating ? "作成中..." : "＋ 新規作成"}
        </button>
      </div>
      <ul className={styles.list}>
        {articles.map((a) => (
          <li
            key={a.id}
            className={`${styles.item} ${a.id === selectedId ? styles.active : ""}`}
            onClick={() => onSelect(a.id)}
          >
            <span className={styles.itemTitle}>{a.title || "(タイトルなし)"}</span>
            <span className={styles.itemDate}>
              {new Date(a.updated_at).toLocaleDateString("ja-JP")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
