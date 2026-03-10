import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BASE_URL, PRESS_RELEASE_QUERY_KEY, PRESS_RELEASE_LIST_QUERY_KEY } from "../constants";

export type PressReleaseSummary = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
};

export type PressRelease = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  tags: string[];
};

export function usePressReleaseListQuery() {
  return useQuery<PressReleaseSummary[]>({
    queryKey: PRESS_RELEASE_LIST_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/press-releases`);
      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`);
      }
      return response.json();
    },
  });
}

export function useCreatePressReleaseMutation() {
  const queryClient = useQueryClient();
  return useMutation<PressRelease, Error, void>({
    mutationFn: async () => {
      const response = await fetch(`${BASE_URL}/press-releases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error("作成に失敗しました");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRESS_RELEASE_LIST_QUERY_KEY });
    },
    onError: (error) => {
      alert(`エラー: ${error.message}`);
    },
  });
}

export function usePressReleaseQuery(id: number) {
  return useQuery<PressRelease>({
    queryKey: [...PRESS_RELEASE_QUERY_KEY, id],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/press-releases/${id}`);
      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`);
      }
      return response.json();
    },
  });
}

export function useSavePressReleaseMutation(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; content: string; tags?: string[] }) => {
      const response = await fetch(`${BASE_URL}/press-releases/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: [...PRESS_RELEASE_QUERY_KEY, id] });
      queryClient.invalidateQueries({ queryKey: PRESS_RELEASE_LIST_QUERY_KEY });
    },
    onError: (error) => {
      alert(`エラー: ${error.message}`);
    },
  });
}
