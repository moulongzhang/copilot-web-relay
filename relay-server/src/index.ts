import 'dotenv/config';
import { createServer } from './server.js';

const PORT = parseInt(process.env.PORT || '3100', 10);

const { server, bridge } = createServer(PORT);

server.listen(PORT, () => {
  console.log(`[relay] Server listening on http://localhost:${PORT}`);
  console.log(`[relay] WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`[relay] Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n[relay] ${signal} received, shutting down...`);
  bridge.stop();
  server.close(() => {
    console.log('[relay] Server closed');
    process.exit(0);
  });
  // Force exit after 5s
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
