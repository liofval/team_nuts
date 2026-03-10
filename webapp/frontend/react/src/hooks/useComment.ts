import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "../constants";

export type Comment = {
  id: number;
  press_release_id: number;
  parent_id: number | null;
  comment_id: string;
  body: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
  replies: Comment[];
};

const commentsQueryKey = (pressReleaseId: number) => ["comments", pressReleaseId];

export function useCommentsQuery(pressReleaseId: number) {
  return useQuery<Comment[]>({
    queryKey: commentsQueryKey(pressReleaseId),
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/press-releases/${pressReleaseId}/comments`);
      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`);
      }
      return response.json();
    },
    // 再フェッチ抑止
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });
}

export function useCreateCommentMutation(pressReleaseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      comment_id: string;
      body: string;
      parent_id?: number;
    }) => {
      const response = await fetch(`${BASE_URL}/press-releases/${pressReleaseId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("コメントの保存に失敗しました");
      }
      return response.json() as Promise<Comment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(pressReleaseId) });
    },
  });
}

export function useResolveCommentMutation(pressReleaseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: number) => {
      const response = await fetch(
        `${BASE_URL}/press-releases/${pressReleaseId}/comments/${commentId}/resolve`,
        { method: "PUT" },
      );
      if (!response.ok) {
        throw new Error("コメントの解決に失敗しました");
      }
      return response.json() as Promise<Comment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(pressReleaseId) });
    },
  });
}

export function useUnresolveCommentMutation(pressReleaseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: number) => {
      const response = await fetch(
        `${BASE_URL}/press-releases/${pressReleaseId}/comments/${commentId}/unresolve`,
        { method: "PUT" },
      );
      if (!response.ok) {
        throw new Error("コメントの解決取消に失敗しました");
      }
      return response.json() as Promise<Comment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(pressReleaseId) });
    },
  });
}

export function useDeleteCommentMutation(pressReleaseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: number) => {
      const response = await fetch(
        `${BASE_URL}/press-releases/${pressReleaseId}/comments/${commentId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("コメントの削除に失敗しました");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(pressReleaseId) });
    },
  });
}
