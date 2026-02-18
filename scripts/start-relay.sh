#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

RELAY_PID=""
TUNNEL_PID=""

# Trap cleanup — set before starting processes so early failures still clean up
cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$RELAY_PID" ] && kill "$RELAY_PID" 2>/dev/null || true
  [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null || true
  wait
  echo "Done."
}
trap cleanup EXIT INT TERM

echo "=== Copilot Web Relay - Start ==="

# Start relay server in background
echo "[1/2] Starting relay server..."
cd "$ROOT_DIR/relay-server"
npx tsx src/index.ts &
RELAY_PID=$!
echo "  Relay server PID: $RELAY_PID"

# Wait for server to be ready
sleep 2

# Start Cloudflare tunnel
echo "[2/2] Starting Cloudflare tunnel..."
if command -v cloudflared &>/dev/null; then
  if [ -f "$HOME/.cloudflared/config.yml" ]; then
    cloudflared tunnel run copilot-relay &
  else
    echo "  No named tunnel configured. Using quick tunnel..."
    cloudflared tunnel --url http://localhost:3100 &
  fi
  TUNNEL_PID=$!
  echo "  Tunnel PID: $TUNNEL_PID"
else
  echo "  WARNING: cloudflared not found. Install with: brew install cloudflared"
  echo "  Relay server is running locally on http://localhost:3100"
fi

echo ""
echo "=== Running ==="
echo "  Relay:  http://localhost:3100"
echo "  Health: http://localhost:3100/health"
echo ""
echo "Press Ctrl+C to stop."

wait
