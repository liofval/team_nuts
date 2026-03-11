import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "../constants";

export type Template = {
  id: number;
  name: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

const TEMPLATES_QUERY_KEY = ["templates"];

export function useTemplatesQuery() {
  return useQuery<Template[]>({
    queryKey: TEMPLATES_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/templates`);
      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`);
      }
      return response.json();
    },
  });
}

export function useCreateTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; title: string; content: string }) => {
      const response = await fetch(`${BASE_URL}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("テンプレートの保存に失敗しました");
      }
      return response.json() as Promise<Template>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
    },
    onError: (error) => {
      alert(`エラー: ${error.message}`);
    },
  });
}

export function useUpdateTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name: string; title: string; content: string }) => {
      const response = await fetch(`${BASE_URL}/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("テンプレートの更新に失敗しました");
      }
      return response.json() as Promise<Template>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
    },
    onError: (error) => {
      alert(`エラー: ${error.message}`);
    },
  });
}

export function useDeleteTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${BASE_URL}/templates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("テンプレートの削除に失敗しました");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
    },
    onError: (error) => {
      alert(`エラー: ${error.message}`);
    },
  });
}
