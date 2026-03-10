import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "../../../constants";
import type { Tag } from "../../../shared/types/tag";
import { useDebounce } from "../../../shared/hooks/useDebounce";

const TAG_SUGGEST_KEY = ["tag-suggest"] as const;

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function buildSuggestUrl(params: { q: string; limit: number }) {
  const endpoint = joinUrl(BASE_URL, "/v1/tags/suggest");
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  qs.set("limit", String(params.limit));
  return `${endpoint}?${qs.toString()}`;
}

export function useTagSuggest(input: string, options?: { limit?: number; enabled?: boolean }) {
  const debounced = useDebounce(input, 120);
  const limit = options?.limit ?? 10;
  const enabled = options?.enabled ?? true;

  const url = buildSuggestUrl({ q: debounced.trim(), limit });

  return useQuery({
    queryKey: [...TAG_SUGGEST_KEY, { q: debounced.trim(), limit }],
    queryFn: async (): Promise<Tag[]> => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`tag suggest failed: ${res.status}`);
      return (await res.json()) as Tag[];
    },
    enabled: enabled && debounced.trim().length > 0,
    staleTime: 30_000,
  });
}