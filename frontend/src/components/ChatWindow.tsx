import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../utils/protocol';
import MessageBubble from './MessageBubble';

interface Props {
  messages: ChatMessage[];
}

export default function ChatWindow({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-window">
      {messages.length === 0 && (
        <div className="chat-empty">
          <h2>Copilot Web Relay</h2>
          <p>Send a message to start chatting with Copilot CLI</p>
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
