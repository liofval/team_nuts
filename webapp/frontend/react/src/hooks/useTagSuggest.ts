// src/hooks/useTagSuggest.ts
import { useCallback, useState } from "react";
import type { TagItem, TagSuggestResponse } from "../types/reference";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export function useTagSuggest() {
  const [items, setItems] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggest = useCallback(async (q: string, limit = 10) => {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/api/v1/tags/suggest`);
      if (q.trim()) url.searchParams.set("q", q.trim());
      url.searchParams.set("limit", String(limit));

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`failed to fetch /api/v1/tags/suggest: ${res.status}`);
      }

      const data = (await res.json()) as TagSuggestResponse;
      setItems(Array.isArray(data.items) ? data.items : []);
    } finally {
      setLoading(false);
    }
  }, []);

  return { items, loading, fetchSuggest };
}