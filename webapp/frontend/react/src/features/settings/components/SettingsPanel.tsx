import { useState, useEffect } from "react";
import { useSettingsQuery, useSaveSettingsMutation } from "../hooks/useSettings";
import "./SettingsPanel.css";

export default function SettingsPanel() {
  const { data: settings, isLoading } = useSettingsQuery();
  const saveMutation = useSaveSettingsMutation();

  const [xKey, setXKey] = useState("");
  const [instaKey, setInstaKey] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (settings) {
      setXKey("");
      setInstaKey("");
    }
  }, [settings]);

  const handleSave = () => {
    setMessage(null);
    saveMutation.mutate(
      { x_api_key: xKey, instagram_api_key: instaKey },
      {
        onSuccess: () => {
          setMessage({ type: "success", text: "設定を保存しました" });
          setXKey("");
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

  return (
    <div className="settingsPanel">
      <div className="settingsDescription">
        APIキーを設定すると、記事保存時にSNS下書きが自動生成されます。
      </div>

      <div className="settingsSection">
        <div className="settingsSectionTitle">
          X（旧Twitter）APIキー
          {settings?.x_api_key_set && <span className="settingsBadge">設定済み</span>}
        </div>
        <input
          type="password"
          className="settingsInput"
          placeholder={settings?.x_api_key_set ? settings.x_api_key : "APIキーを入力"}
          value={xKey}
          onChange={(e) => setXKey(e.target.value)}
        />
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
