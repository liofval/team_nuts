export type SNSPost = {
  id: number;
  press_release_id: number;
  platform: "x" | "instagram";
  content: string;
  char_count: number;
  status: "draft" | "posted" | "failed";
  posted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GenerateSNSRequest = {
  title: string;
  content: string;
};
