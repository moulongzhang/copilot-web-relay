import 'dotenv/config';
import { createServer } from './server.js';

const PORT = parseInt(process.env.PORT || '3100', 10);

const { server, wss, bridge } = createServer(PORT);

server.listen(PORT, () => {
  console.log(`[relay] Server listening on http://localhost:${PORT}`);
  console.log(`[relay] WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`[relay] Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) {
    console.log(`[relay] Force exit`);
    process.exit(1);
  }
  shuttingDown = true;
  console.log(`\n[relay] ${signal} received, shutting down...`);
  bridge.stop();
  wss.clients.forEach((client) => client.terminate());
  wss.close();
  server.close(() => {
    console.log('[relay] Server closed');
  });
  // Exit immediately — don't wait for server.close callback
  setTimeout(() => process.exit(0), 200);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
