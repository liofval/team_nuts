import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "../../../constants";
import type { SNSPost, GenerateSNSRequest } from "../types";

const SNS_POSTS_KEY = "sns-posts";

export function useSNSPostsQuery(pressReleaseId: number) {
  return useQuery<SNSPost[]>({
    queryKey: [SNS_POSTS_KEY, pressReleaseId],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/press-releases/${pressReleaseId}/sns`);
      if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);
      return res.json();
    },
  });
}

export function useGenerateSNSMutation(pressReleaseId: number) {
  const queryClient = useQueryClient();
  return useMutation<SNSPost[], Error, GenerateSNSRequest>({
    mutationFn: async (data) => {
      const res = await fetch(`${BASE_URL}/press-releases/${pressReleaseId}/sns/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("SNS投稿文の生成に失敗しました");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SNS_POSTS_KEY, pressReleaseId] });
    },
  });
}

export function useUpdateSNSPostMutation(pressReleaseId: number) {
  const queryClient = useQueryClient();
  return useMutation<SNSPost, Error, { postId: number; content: string }>({
    mutationFn: async ({ postId, content }) => {
      const res = await fetch(`${BASE_URL}/sns-posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SNS_POSTS_KEY, pressReleaseId] });
    },
  });
}

