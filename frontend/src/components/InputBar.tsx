import { useState, type KeyboardEvent } from 'react';

interface Props {
  onSend: (content: string) => void;
  disabled: boolean;
  isWaiting: boolean;
  onInterrupt: () => void;
}

export default function InputBar({ onSend, disabled, isWaiting, onInterrupt }: Props) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-bar">
      <textarea
        className="input-textarea"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Send a message…"
        rows={1}
        disabled={disabled || isWaiting}
      />
      {isWaiting ? (
        <button className="stop-button" onClick={onInterrupt} title="Stop generating">
          ■
        </button>
      ) : (
        <button
          className="send-button"
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          title="Send"
        >
          ▲
        </button>
      )}
    </div>
  );
}
