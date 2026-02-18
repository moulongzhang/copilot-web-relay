#!/usr/bin/env bash
set -euo pipefail

echo "=== Cloudflare Tunnel Setup ==="
echo ""

# Check cloudflared
if ! command -v cloudflared &>/dev/null; then
  echo "cloudflared not found. Installing..."
  if command -v brew &>/dev/null; then
    brew install cloudflared
  else
    echo "Please install cloudflared manually:"
    echo "  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    exit 1
  fi
fi

echo "[1/3] Logging in to Cloudflare..."
cloudflared tunnel login

echo ""
echo "[2/3] Creating named tunnel 'copilot-relay'..."
cloudflared tunnel create copilot-relay

TUNNEL_ID=$(cloudflared tunnel list | grep copilot-relay | awk '{print $1}')
echo "  Tunnel ID: $TUNNEL_ID"

echo ""
echo "[3/3] Creating config file..."
mkdir -p "$HOME/.cloudflared"
cat > "$HOME/.cloudflared/config.yml" <<EOF
tunnel: $TUNNEL_ID
credentials-file: $HOME/.cloudflared/$TUNNEL_ID.json
ingress:
  - service: http://localhost:3100
EOF

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start the tunnel:  cloudflared tunnel run copilot-relay"
echo "Or use:               ./scripts/start-relay.sh"
echo ""
echo "Your tunnel URL will be shown when running 'cloudflared tunnel run'."
echo "Configure a DNS record in Cloudflare for a stable hostname."
