import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "../constants";

export type SearchParams = {
  q?: string;
  tags?: string[]; // slugs
  page?: number;
  per_page?: number;
};

export async function searchPressReleases(params: SearchParams) {
  const sp = new URLSearchParams();
  if (params.q) sp.append("q", params.q);
  if (params.tags && params.tags.length) sp.append("tags", params.tags.join(","));
  sp.append("page", String(params.page ?? 1));
  sp.append("per_page", String(params.per_page ?? 20));

  const res = await fetch(`${BASE_URL}/v1/search?${sp.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "検索に失敗しました");
  }
  return res.json();
}

export function useSearch(params: SearchParams, enabled = true) {
  return useQuery({
    queryKey: ["search", params],
    queryFn: () => searchPressReleases(params),
    enabled,
  });
}
