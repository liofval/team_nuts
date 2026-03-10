import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PRESS_RELEASE_QUERY_KEY } from "../constants";

const TAG_BASE_URL = "http://localhost:8080";

export interface TagItem {
  id: number;
  name: string;
  slug: string;
  type: string;
  count: number;
}

// ─── タグ候補取得 ─────────────────────────────────────────────────

export function useTagSuggestQuery(q: string) {
  return useQuery({
    queryKey: ["tag-suggest", q],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "20" });
      if (q) params.set("q", q);
      const response = await fetch(`${TAG_BASE_URL}/v1/tags/suggest?${params}`);
      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`);
      }
      const data = await response.json();
      return data.items as TagItem[];
    },
  });
}

// ─── タグ保存 ─────────────────────────────────────────────────────

export function useSaveTagsMutation(pressReleaseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tags: string[]) => {
      const response = await fetch(
        `${TAG_BASE_URL}/v1/press_release/${pressReleaseId}/tags`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags, create_missing: true }),
        }
      );
      if (!response.ok) {
        throw new Error("タグの保存に失敗しました");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRESS_RELEASE_QUERY_KEY });
    },
    onError: (error) => {
      alert(`エラー: ${error.message}`);
    },
  });
}