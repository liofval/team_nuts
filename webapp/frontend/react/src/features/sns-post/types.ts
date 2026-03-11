export type SNSPost = {
  id: number;
  press_release_id: number;
  platform: "x" | "instagram";
  content: string;
  char_count: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type GenerateSNSRequest = {
  title: string;
  content: string;
};
