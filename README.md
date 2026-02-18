# Copilot Web Relay

A ChatGPT-like web interface hosted on GitHub Pages that relays prompts to a local machine running GitHub Copilot CLI. The local relay server processes prompts using the full Copilot agent (file ops, code execution, GitHub tools) and streams responses back in real-time via Cloudflare Tunnel.

## Architecture

```
┌─────────────────────┐     WebSocket (wss://)     ┌──────────────────────┐
│   GitHub Pages      │ ◄──────────────────────►   │  Local Relay Server  │
│   (Static Chat UI)  │    via Cloudflare Tunnel    │  (Node.js + node-pty)│
│                     │                             │         │            │
│  - React/Vite SPA   │                             │         ▼            │
│  - Markdown render   │                             │  ┌──────────────┐   │
│  - Tool status UI    │                             │  │ Copilot CLI  │   │
│  - ANSI→HTML conv.   │                             │  │ (child proc) │   │
└─────────────────────┘                             │  └──────────────┘   │
        │                                           └──────────────────────┘
        │ hosted on                                          │
  moulongzhang.github.io                              cloudflared tunnel
  /copilot-web-relay                                  (stable named tunnel)
```

## Prerequisites

- **Node.js 18+**
- **Copilot CLI** installed and authenticated (`copilot` command works)
- **C++ build tools** for node-pty:
  - macOS: `xcode-select --install`
  - Linux: `sudo apt install build-essential python3`
- **cloudflared** (optional, for remote access): `brew install cloudflared`

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/moulongzhang/copilot-web-relay.git
cd copilot-web-relay
npm install
```

### 2. Configure the Relay Server

```bash
cp relay-server/.env.example relay-server/.env
# Edit relay-server/.env — set AUTH_TOKEN to a secret value
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3100` | Server port |
| `COPILOT_CMD` | `copilot` | Copilot CLI command |
| `AUTH_TOKEN` | (none) | Shared secret for WebSocket auth |

### 3. Start the Relay Server

```bash
# Development (with hot reload)
npm run dev:relay

# Or production
npm run build:relay && npm run start:relay
```

### 4. Expose via Cloudflare Tunnel (optional)

**Quick tunnel (temporary URL):**
```bash
cloudflared tunnel --url http://localhost:3100
```

**Named tunnel (stable URL):**
```bash
# One-time setup
./scripts/setup-tunnel.sh

# Start
cloudflared tunnel run copilot-relay
```

**Or start everything at once:**
```bash
chmod +x scripts/start-relay.sh
./scripts/start-relay.sh
```

### 5. Open the Frontend

Visit [moulongzhang.github.io/copilot-web-relay](https://moulongzhang.github.io/copilot-web-relay) (after deploying), or run locally:

```bash
npm run dev:frontend
```

Click the ⚙ button to configure:
- **Relay Server URL**: Your tunnel URL (e.g., `wss://your-tunnel.trycloudflare.com/ws`)
- **Auth Token**: The same token you set in `.env`

## Development

```bash
# Frontend dev server (port 5173)
npm run dev:frontend

# Relay server dev (port 3100, hot reload)
npm run dev:relay

# Build frontend for production
npm run build:frontend

# Build relay server
npm run build:relay
```

## Project Structure

```
copilot-web-relay/
├── frontend/             # React + Vite chat UI → GitHub Pages
│   ├── src/
│   │   ├── components/   # ChatWindow, MessageBubble, InputBar, etc.
│   │   ├── hooks/        # useWebSocket, useChat
│   │   └── utils/        # Protocol types, ANSI conversion
│   └── ...
├── relay-server/         # Node.js relay server
│   ├── src/
│   │   ├── server.ts         # Express + WebSocket server
│   │   ├── copilot-bridge.ts # PTY management
│   │   └── output-parser.ts  # CLI output → structured events
│   └── ...
├── scripts/              # Start/setup shell scripts
└── .github/workflows/    # GitHub Pages deployment
```

## Security

- **Auth token**: A shared secret sent in the WebSocket handshake (`Sec-WebSocket-Protocol` header). Set a strong, unique token.
- **Cloudflare Tunnel**: Provides TLS encryption. Your local server never needs to open a port to the internet directly.
- **Single user**: Designed for personal use. Do not share your tunnel URL or auth token.

## Troubleshooting

| Issue | Solution |
|---|---|
| `node-pty` build fails | Install C++ tools: `xcode-select --install` (macOS) or `apt install build-essential python3` (Linux) |
| `copilot` command not found | Install Copilot CLI and ensure it's on your PATH |
| WebSocket won't connect | Check tunnel URL format (must be `wss://...`), verify auth token matches |
| Output parsing looks wrong | The parser may need tuning for your Copilot CLI version — open an issue |

## License

MIT
