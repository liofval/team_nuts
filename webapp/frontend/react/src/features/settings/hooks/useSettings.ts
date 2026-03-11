import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "../../../constants";
import type { SettingsResponse, SaveSettingsRequest } from "../types";

const SETTINGS_KEY = "settings";

export function useSettingsQuery() {
  return useQuery<SettingsResponse>({
    queryKey: [SETTINGS_KEY],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/settings`);
      if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);
      return res.json();
    },
  });
}

export function useSaveSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation<SettingsResponse, Error, SaveSettingsRequest>({
    mutationFn: async (data) => {
      const res = await fetch(`${BASE_URL}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("設定の保存に失敗しました");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY] });
    },
  });
}
