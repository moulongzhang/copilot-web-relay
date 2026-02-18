import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from './types.js';
import { CopilotBridge } from './copilot-bridge.js';

const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const HEARTBEAT_INTERVAL = 30000;

export function createServer(port: number) {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const bridge = new CopilotBridge();

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      copilot: bridge.isRunning ? 'running' : 'stopped',
    });
  });

  // Start Copilot CLI
  bridge.start();

  // Forward bridge events to all connected clients
  bridge.on('message', (msg: ServerMessage) => {
    broadcast(wss, msg);
  });

  // WebSocket connection handling
  wss.on('connection', (ws, req) => {
    // Auth check via Sec-WebSocket-Protocol header
    if (AUTH_TOKEN) {
      const protocol = req.headers['sec-websocket-protocol'];
      if (protocol !== AUTH_TOKEN) {
        console.log('[ws] Unauthorized connection rejected');
        ws.close(4001, 'Unauthorized');
        return;
      }
    }

    console.log('[ws] Client connected');

    // Heartbeat
    let alive = true;
    ws.on('pong', () => {
      alive = true;
    });

    const heartbeat = setInterval(() => {
      if (!alive) {
        ws.terminate();
        return;
      }
      alive = false;
      ws.ping();
    }, HEARTBEAT_INTERVAL);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ClientMessage;
        handleClientMessage(msg, ws, bridge);
      } catch (err) {
        console.error('[ws] Invalid message:', err);
      }
    });

    ws.on('close', () => {
      console.log('[ws] Client disconnected');
      clearInterval(heartbeat);
    });
  });

  return { app, server, wss, bridge };
}

function handleClientMessage(
  msg: ClientMessage,
  ws: WebSocket,
  bridge: CopilotBridge,
) {
  switch (msg.type) {
    case 'prompt':
      console.log(`[ws] Prompt received: ${msg.content.slice(0, 50)}...`);
      bridge.sendPrompt(msg.content, msg.id);
      break;

    case 'interrupt':
      console.log('[ws] Interrupt received');
      bridge.interrupt();
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
  }
}

function broadcast(wss: WebSocketServer, msg: ServerMessage) {
  const data = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}
