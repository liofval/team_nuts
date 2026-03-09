import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BASE_URL, PRESS_RELEASE_QUERY_KEY } from "../constants";

export function usePressReleaseQuery() {
  return useQuery({
    queryKey: PRESS_RELEASE_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/press-releases/1`);
      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`);
      }
      return response.json();
    },
  });
}

export function useSavePressReleaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const response = await fetch(`${BASE_URL}/press-releases/1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("保存に失敗しました");
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
