import type { Article } from "../../../shared/types/article";

export function useArticleDetail(article: Article | null) {
  // 将来、詳細APIが来たらここで取得する
  return { article, isPending: false, isError: false };
}