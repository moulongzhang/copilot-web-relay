import { useState, useEffect } from 'react';

const SETTINGS_KEY = 'copilot-relay-settings';

export interface Settings {
  tunnelUrl: string;
  token: string;
  theme: 'dark' | 'light';
}

const defaults: Settings = {
  tunnelUrl: '',
  token: '',
  theme: 'dark',
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

interface Props {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (s: Settings) => void;
  onClearHistory: () => void;
}

export default function SettingsPanel({
  open,
  onClose,
  settings,
  onSave,
  onClearHistory,
}: Props) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  if (!open) return null;

  const handleSave = () => {
    saveSettings(draft);
    onSave(draft);
    onClose();
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>

        <label>
          Relay Server URL
          <input
            type="text"
            value={draft.tunnelUrl}
            onChange={(e) => setDraft({ ...draft, tunnelUrl: e.target.value })}
            placeholder="wss://your-tunnel.trycloudflare.com/ws"
          />
        </label>

        <label>
          Auth Token
          <input
            type="password"
            value={draft.token}
            onChange={(e) => setDraft({ ...draft, token: e.target.value })}
            placeholder="Shared secret token"
          />
        </label>

        <label>
          Theme
          <select
            value={draft.theme}
            onChange={(e) =>
              setDraft({ ...draft, theme: e.target.value as 'dark' | 'light' })
            }
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>

        <div className="settings-actions">
          <button className="btn-danger" onClick={onClearHistory}>
            Clear Chat History
          </button>
          <div className="settings-actions-right">
            <button onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { loadSettings, saveSettings };
