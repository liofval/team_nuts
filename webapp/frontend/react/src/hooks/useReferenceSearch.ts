// src/hooks/useReferenceSearch.ts
import { useCallback, useState } from "react";
import type { SearchResponse } from "../types/reference";

import { BASE_URL } from "../constants";

export function useReferenceSearch() {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (params: {
    q?: string;
    tagIds?: number[];
    page?: number;
    perPage?: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(`${BASE_URL}/v1/search`);

      const q = params.q?.trim() ?? "";
      if (q) url.searchParams.set("q", q);

      if (params.tagIds && params.tagIds.length > 0) {
        url.searchParams.set("tag_ids", params.tagIds.join(","));
      }

      url.searchParams.set("page", String(params.page ?? 1));
      url.searchParams.set("per_page", String(params.perPage ?? 12));

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error(`failed to fetch /api/v1/search: ${res.status}`);
      }

      const json = (await res.json()) as SearchResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, search };
}