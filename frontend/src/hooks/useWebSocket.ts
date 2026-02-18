import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, ServerMessage, ConnectionStatus } from '../utils/protocol';

const RECONNECT_INTERVAL = 3000;
const PING_INTERVAL = 30000;

interface UseWebSocketOptions {
  url: string | null;
  token?: string;
  onMessage: (msg: ServerMessage) => void;
}

export function useWebSocket({ url, token, onMessage }: UseWebSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval>>();
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!url) return;

    setStatus('reconnecting');
    const protocols = token ? [token] : undefined;
    const ws = new WebSocket(url, protocols);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, PING_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        onMessageRef.current(msg);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      cleanup();
      reconnectRef.current = setTimeout(connect, RECONNECT_INTERVAL);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url, token]);

  const cleanup = useCallback(() => {
    if (pingRef.current) clearInterval(pingRef.current);
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      cleanup();
      wsRef.current?.close();
    };
  }, [connect, cleanup]);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    wsRef.current?.close();
    setStatus('disconnected');
  }, [cleanup]);

  return { status, send, disconnect };
}
