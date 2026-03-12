import { useState, useEffect } from "react";
import { useSettingsQuery, useSaveSettingsMutation } from "../hooks/useSettings";
import "./SettingsPanel.css";

export default function SettingsPanel() {
  const { data: settings, isLoading } = useSettingsQuery();
  const saveMutation = useSaveSettingsMutation();

  const [xApiKey, setXApiKey] = useState("");
  const [xApiSecret, setXApiSecret] = useState("");
  const [xAccessToken, setXAccessToken] = useState("");
  const [xAccessSecret, setXAccessSecret] = useState("");
  const [instaKey, setInstaKey] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (settings) {
      setXApiKey("");
      setXApiSecret("");
      setXAccessToken("");
      setXAccessSecret("");
      setInstaKey("");
    }
  }, [settings]);

  const handleSave = () => {
    setMessage(null);
    saveMutation.mutate(
      {
        x_api_key: xApiKey,
        x_api_secret: xApiSecret,
        x_access_token: xAccessToken,
        x_access_secret: xAccessSecret,
        instagram_api_key: instaKey,
      },
      {
        onSuccess: () => {
          setMessage({ type: "success", text: "設定を保存しました" });
          setXApiKey("");
          setXApiSecret("");
          setXAccessToken("");
          setXAccessSecret("");
          setInstaKey("");
        },
        onError: () => {
          setMessage({ type: "error", text: "設定の保存に失敗しました" });
        },
      }
    );
  };

  if (isLoading) {
    return <div className="settingsPanel">読み込み中...</div>;
  }

  const xFields = [
    { label: "API Key", value: xApiKey, setter: setXApiKey, key: "x_api_key" as const, set: settings?.x_api_key_set, masked: settings?.x_api_key },
    { label: "API Secret", value: xApiSecret, setter: setXApiSecret, key: "x_api_secret" as const, set: settings?.x_api_secret_set, masked: settings?.x_api_secret },
    { label: "Access Token", value: xAccessToken, setter: setXAccessToken, key: "x_access_token" as const, set: settings?.x_access_token_set, masked: settings?.x_access_token },
    { label: "Access Token Secret", value: xAccessSecret, setter: setXAccessSecret, key: "x_access_secret" as const, set: settings?.x_access_secret_set, masked: settings?.x_access_secret },
  ];

  return (
    <div className="settingsPanel">
      <div className="settingsDescription">
        APIキーを設定すると、SNS下書きからXへの投稿が可能になります。
      </div>

      <div className="settingsSection">
        <div className="settingsSectionTitle">
          X（旧Twitter）認証情報
        </div>
        {xFields.map((field) => (
          <div key={field.key} className="settingsField">
            <label className="settingsFieldLabel">
              {field.label}
              {field.set && <span className="settingsBadge">設定済み</span>}
            </label>
            <input
              type="password"
              className="settingsInput"
              placeholder={field.set ? field.masked : `${field.label}を入力`}
              value={field.value}
              onChange={(e) => field.setter(e.target.value)}
            />
          </div>
        ))}
        <div className="settingsHint">空で保存すると削除されます</div>
      </div>

      <div className="settingsSection">
        <div className="settingsSectionTitle">
          Instagram APIキー
          {settings?.instagram_api_key_set && <span className="settingsBadge">設定済み</span>}
        </div>
        <input
          type="password"
          className="settingsInput"
          placeholder={settings?.instagram_api_key_set ? settings.instagram_api_key : "APIキーを入力"}
          value={instaKey}
          onChange={(e) => setInstaKey(e.target.value)}
        />
        <div className="settingsHint">空で保存すると削除されます</div>
      </div>

      <button
        className="settingsSaveBtn"
        onClick={handleSave}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? "保存中..." : "設定を保存"}
      </button>

      {message && (
        <div className={`settingsMessage ${message.type === "success" ? "settingsMessageSuccess" : "settingsMessageError"}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
