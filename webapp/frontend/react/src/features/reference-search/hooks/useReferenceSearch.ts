import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "../../../constants";
import type { Article } from "../../../shared/types/article";
import type { Tag } from "../../../shared/types/tag";
import { useDebounce } from "../../../shared/hooks/useDebounce";

const RECOMMEND_QUERY_KEY = ["recommend"] as const;

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function buildRecommendUrl(params: { q: string; tagIds: number[]; limit: number }) {
  // BASE_URL="/api" → "/api/v1/recommend"
  const endpoint = joinUrl(BASE_URL, "/v1/recommend");

  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.tagIds.length > 0) qs.set("tag_ids", params.tagIds.join(","));
  qs.set("limit", String(params.limit));

  const query = qs.toString();
  return `${endpoint}?${query}`;
}

export function useReferenceSearch(options?: { limit?: number }) {
  const limit = options?.limit ?? 8;

  // keyword
  const [q, setQ] = useState("");

  // tag filter: Tag{id,name} を保持（tag_ids を作るため）
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState("");

  const debouncedQ = useDebounce(q, 150);

  const tagIds = useMemo(() => selectedTags.map((t) => t.id), [selectedTags]);

  const url = useMemo(
    () =>
      buildRecommendUrl({
        q: debouncedQ.trim(),
        tagIds,
        limit,
      }),
    [debouncedQ, tagIds, limit]
  );

  const query = useQuery({
    queryKey: [...RECOMMEND_QUERY_KEY, { q: debouncedQ.trim(), tagIds, limit }],
    queryFn: async (): Promise<Article[]> => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`recommend failed: ${res.status}`);
      return (await res.json()) as Article[];
    },
    enabled: true,
    staleTime: 10_000,
  });

  const addTag = (tag: Tag) => {
    setSelectedTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]));
    setTagInput("");
  };

  const removeTag = (tagId: number) => {
    setSelectedTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  const clear = () => {
    setQ("");
    setSelectedTags([]);
    setTagInput("");
  };

  return {
    // keyword
    q,
    setQ,

    // tag filter
    selectedTags,
    addTag,
    removeTag,
    tagInput,
    setTagInput,

    limit,
    clear,

    ...query,
  };
}