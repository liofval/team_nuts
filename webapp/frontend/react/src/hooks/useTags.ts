import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "../constants";

export type TagItem = {
  id: number;
  name: string;
  slug: string;
  type: string;
  count?: number;
};

export async function fetchTagSuggestions(q?: string, type?: string, limit = 10): Promise<TagItem[]> {
  const params = new URLSearchParams();
  if (q) params.append("q", q);
  if (type) params.append("type", type);
  if (limit) params.append("limit", String(limit));

  const res = await fetch(`${BASE_URL}/v1/tags/suggest?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "タグ候補の取得に失敗しました");
  }
  const data = await res.json();
  return data.items ?? [];
}

export function useTagSuggestions(q?: string, type?: string, enabled = true) {
  return useQuery<TagItem[], Error>({
    queryKey: ["tags", "suggest", q, type],
    queryFn: () => fetchTagSuggestions(q, type),
    enabled: enabled && !!q && q.length >= 1,
    staleTime: 1000 * 30,
  });
}

export async function assignTags(pressReleaseId: number, tags: string[], createMissing = true) {
  const res = await fetch(`${BASE_URL}/v1/press_release/${pressReleaseId}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags, create_missing: createMissing }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "タグ付けに失敗しました");
  }
  return res.json();
}

export function useAssignTagsMutation(pressReleaseId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { tags: string[]; createMissing?: boolean }) => {
      if (!pressReleaseId) throw new Error("pressReleaseId required");
      return assignTags(pressReleaseId, payload.tags, payload.createMissing ?? true);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["press-release", pressReleaseId] });
      qc.invalidateQueries({ queryKey: ["tags", "suggest"] });
    },
  });
}

export async function updateTag(pressReleaseId: number, tagId: number, payload: { name?: string; slug?: string; type?: string }) {
  const res = await fetch(`${BASE_URL}/v1/press_release/${pressReleaseId}/tags/${tagId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "タグ更新に失敗しました");
  }
  return res.json();
}

export function useUpdateTagMutation(pressReleaseId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { tagId: number; payload: { name?: string; slug?: string; type?: string } }) => {
      if (!pressReleaseId) throw new Error("pressReleaseId required");
      return updateTag(pressReleaseId, args.tagId, args.payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["press-release", pressReleaseId] });
      qc.invalidateQueries({ queryKey: ["tags", "suggest"] });
    },
  });
}

export async function deleteTagAssignment(pressReleaseId: number, tagId: number) {
  const res = await fetch(`${BASE_URL}/v1/press_release/${pressReleaseId}/tags/${tagId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "タグ解除に失敗しました");
  }
  return res.json();
}

export function useDeleteTagAssignmentMutation(pressReleaseId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tagId: number) => {
      if (!pressReleaseId) throw new Error("pressReleaseId required");
      return deleteTagAssignment(pressReleaseId, tagId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["press-release", pressReleaseId] });
      qc.invalidateQueries({ queryKey: ["tags", "suggest"] });
    },
  });
}
