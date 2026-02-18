import { useState, useCallback, useEffect } from 'react';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import ConnectionStatus from './components/ConnectionStatus';
import SettingsPanel, { loadSettings, type Settings } from './components/Settings';
import { useWebSocket } from './hooks/useWebSocket';
import { useChat } from './hooks/useChat';

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { messages, addUserMessage, handleServerMessage, clearHistory } = useChat();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const wsUrl = settings.tunnelUrl
    ? settings.tunnelUrl.replace(/\/$/, '') + (settings.tunnelUrl.includes('/ws') ? '' : '/ws')
    : null;

  const { status, send } = useWebSocket({
    url: wsUrl,
    token: settings.token || undefined,
    onMessage: handleServerMessage,
  });

  const isWaiting = messages.some((m) => m.role === 'assistant' && !m.done);

  const handleSend = useCallback(
    (content: string) => {
      const id = crypto.randomUUID();
      addUserMessage(content, id);
      send({ type: 'prompt', content, id });
    },
    [addUserMessage, send],
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>Copilot Web Relay</h1>
        <div className="header-actions">
          <ConnectionStatus status={status} />
          <button className="settings-btn" onClick={() => setSettingsOpen(true)} title="Settings">
            ⚙
          </button>
        </div>
      </header>

      <ChatWindow messages={messages} />

      <div className="input-container">
        <InputBar onSend={handleSend} disabled={status !== 'connected' || isWaiting} />
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
        onClearHistory={clearHistory}
      />
    </div>
  );
}
