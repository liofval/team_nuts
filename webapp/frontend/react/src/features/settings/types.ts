export type SettingsResponse = {
  x_api_key: string;
  x_api_key_set: boolean;
  instagram_api_key: string;
  instagram_api_key_set: boolean;
};

export type SaveSettingsRequest = {
  x_api_key: string;
  instagram_api_key: string;
};
