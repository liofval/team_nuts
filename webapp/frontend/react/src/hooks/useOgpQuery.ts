import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "../constants";

export type OgpData = {
  url: string;
  title: string;
  description: string;
  imageUrl: string;
};

export function useOgpQuery(url: string) {
  return useQuery({
    queryKey: ["ogp", url],
    queryFn: async (): Promise<OgpData> => {
      const response = await fetch(
        `${BASE_URL}/ogp?url=${encodeURIComponent(url)}`,
      );
      if (!response.ok) {
        throw new Error("OGP情報の取得に失敗しました");
      }
      return response.json();
    },
    enabled: false, // 明示的に refetch するまで実行しない
    retry: false,
  });
}