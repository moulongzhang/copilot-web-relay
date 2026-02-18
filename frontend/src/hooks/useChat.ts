import { useCallback, useState } from 'react';
import type { ChatMessage, ServerMessage } from '../utils/protocol';

const STORAGE_KEY = 'copilot-relay-chat-history';

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
  } catch {
    // storage full — ignore
  }
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory);

  const addUserMessage = useCallback((content: string, id: string) => {
    setMessages((prev) => {
      const next = [
        ...prev,
        {
          id,
          role: 'user' as const,
          content,
          tools: [],
          done: true,
          timestamp: Date.now(),
        },
        {
          id: id + '-response',
          role: 'assistant' as const,
          content: '',
          tools: [],
          done: false,
          timestamp: Date.now(),
        },
      ];
      saveHistory(next);
      return next;
    });
  }, []);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    if (msg.type === 'pong') return;

    setMessages((prev) => {
      const next = [...prev];
      const idx = next.findIndex(
        (m) => m.role === 'assistant' && m.id === msg.id + '-response',
      );
      if (idx === -1) return prev;

      const message = { ...next[idx] };

      switch (msg.type) {
        case 'stream':
          message.content += msg.content;
          break;
        case 'tool_start':
          message.tools = [
            ...message.tools,
            { tool: msg.tool, detail: msg.detail, status: 'running' },
          ];
          break;
        case 'tool_end':
          message.tools = message.tools.map((t) =>
            t.tool === msg.tool && t.status === 'running'
              ? { ...t, status: msg.status as 'success' | 'failure' }
              : t,
          );
          break;
        case 'done':
          message.done = true;
          break;
        case 'error':
          message.content += `\n\n**Error:** ${msg.message}`;
          message.done = true;
          break;
      }

      next[idx] = message;
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { messages, addUserMessage, handleServerMessage, clearHistory };
}
