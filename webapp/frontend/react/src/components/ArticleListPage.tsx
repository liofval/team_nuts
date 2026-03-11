import type { PressReleaseSummary } from "../hooks/usePressRelease";
import "./ArticleListPage.css";

type Props = {
  articles: PressReleaseSummary[];
  onSelect: (id: number) => void;
  onCreateNew: () => void;
  isCreating: boolean;
};

export default function ArticleListPage({
  articles,
  onSelect,
  onCreateNew,
  isCreating,
}: Props) {
  return (
    <div className="articleListPage">
      <header className="header">
        <h1 className="headerTitle">プレスリリースエディター</h1>
      </header>
      <div className="articleListPageBody">
        <div className="articleListPageInner">
          <div className="articleListPageActions">
            <button
              type="button"
              className="articleListPageCreateButton"
              onClick={onCreateNew}
              disabled={isCreating}
            >
              {isCreating ? "作成中..." : "＋ 新規作成"}
            </button>
          </div>
          {articles.length === 0 ? (
            <p className="articleListPageEmpty">
              記事がありません。新規作成してください。
            </p>
          ) : (
            <div className="articleListPageGrid">
              {articles.map((a) => (
                <div
                  key={a.id}
                  className="articleListPageCard"
                  onClick={() => onSelect(a.id)}
                >
                  <span className="articleListPageCardTitle">
                    {a.title || "(タイトルなし)"}
                  </span>
                  <span className="articleListPageCardDate">
                    {new Date(a.updated_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
