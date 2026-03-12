export type SettingsResponse = {
  x_api_key: string;
  x_api_key_set: boolean;
  x_api_secret: string;
  x_api_secret_set: boolean;
  x_access_token: string;
  x_access_token_set: boolean;
  x_access_secret: string;
  x_access_secret_set: boolean;
  instagram_api_key: string;
  instagram_api_key_set: boolean;
};

export type SaveSettingsRequest = {
  x_api_key: string;
  x_api_secret: string;
  x_access_token: string;
  x_access_secret: string;
  instagram_api_key: string;
};
