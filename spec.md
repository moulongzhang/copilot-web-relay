# Copilot Web Relay — Implementation Plan

## Problem Statement
Build a web application that provides a ChatGPT-like chat interface hosted on GitHub Pages, which relays prompts to a local machine running GitHub Copilot CLI. The local machine processes prompts using the full Copilot agent (file ops, code execution, GitHub tools) and streams responses back in real-time via Cloudflare Tunnel.

**Repository:** `moulongzhang/copilot-web-relay`

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

### Three Components
1. **Frontend (GitHub Pages)** — React + Vite + TypeScript SPA with ChatGPT-like chat UI
2. **Local Relay Server** — Node.js/TS server bridging WebSocket ↔ Copilot CLI via node-pty
3. **Cloudflare Tunnel** — Exposes local server to the internet (wss://)

## Project Structure

```
copilot-web-relay/
├── frontend/                    # React chat UI (deployed to GH Pages)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/          # ChatWindow, MessageBubble, InputBar, ToolIndicator, ConnectionStatus, Settings
│   │   ├── hooks/               # useWebSocket, useChat
│   │   ├── utils/               # ansi.ts, protocol.ts
│   │   └── styles/              # chat.css
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── relay-server/                # Local Node.js relay server
│   ├── src/
│   │   ├── index.ts             # Entry point
│   │   ├── server.ts            # Express + WebSocket setup
│   │   ├── copilot-bridge.ts    # PTY management for Copilot CLI
│   │   ├── output-parser.ts     # Parse CLI output into structured events
│   │   └── types.ts             # Shared TypeScript types
│   └── package.json
├── scripts/                     # start-relay.sh, setup-tunnel.sh
├── .github/workflows/           # deploy-pages.yml
├── README.md
└── package.json                 # Root workspace config
```

## WebSocket Protocol

**Client → Server:**
- `{ "type": "prompt", "content": "...", "id": "msg-uuid" }`
- `{ "type": "interrupt", "id": "msg-uuid" }`
- `{ "type": "ping" }`

**Server → Client:**
- `{ "type": "stream", "content": "partial text...", "id": "msg-uuid" }`
- `{ "type": "tool_start", "tool": "edit_file", "detail": "src/auth.ts", "id": "msg-uuid" }`
- `{ "type": "tool_end", "tool": "edit_file", "status": "success", "id": "msg-uuid" }`
- `{ "type": "done", "id": "msg-uuid" }`
- `{ "type": "error", "message": "...", "id": "msg-uuid" }`
- `{ "type": "pong" }`

## Implementation Todos

1. **repo-setup** — Initialize monorepo with npm workspaces, TypeScript configs for both frontend & relay-server
2. **ws-protocol** — Define shared WebSocket protocol types (TypeScript interfaces for all message types)
3. **relay-server-core** — Build Express + WebSocket server with health check endpoint
4. **copilot-bridge** — Implement CopilotBridge class: node-pty spawn/manage Copilot CLI, auto-restart on crash
5. **output-parser** — Parse raw terminal output into structured events (stream, tool_start/end, done, error)
6. **frontend-scaffold** — Scaffold React + Vite app with layout, routing, dark/light theme
7. **chat-ui** — ChatGPT-like components: ChatWindow, MessageBubble, InputBar, markdown rendering, ANSI→HTML
8. **ws-client** — useWebSocket hook with auto-reconnect, streaming support, connection status
9. **tool-indicators** — Tool execution indicators in chat UI (file edit, shell commands, etc.)
10. **settings-panel** — Settings for tunnel URL config, theme toggle, chat history in localStorage
11. **gh-pages-deploy** — GitHub Actions workflow: build frontend → deploy to gh-pages branch
12. **startup-scripts** — Shell scripts to start relay server + Cloudflare tunnel together
13. **readme-docs** — Comprehensive README: architecture, setup guide, usage, troubleshooting

## Prerequisites (User Setup Required)

### Must Have:
- **Node.js 18+** installed locally
- **Copilot CLI** installed and authenticated (`copilot` command works in terminal)
- **node-pty build tools** — Python 3 + C++ compiler (Xcode CLT on macOS, build-essential on Linux)
- **Cloudflare account** (free tier sufficient) + `cloudflared` CLI (`brew install cloudflared`)
- **GitHub repo** `moulongzhang/copilot-web-relay` created
- **GitHub Pages** enabled (Settings → Pages → Source: GitHub Actions)

### Nice to Have:
- Custom domain in Cloudflare for stable tunnel URL
- `nvm` for Node.js version management

## Key Concerns

1. **Output parsing complexity** — Copilot CLI uses rich terminal output (ANSI codes, spinners, progress bars). The parser will need iterative refinement as we discover edge cases.
2. **node-pty native compilation** — Biggest setup friction point. Requires Python 3 + C++ toolchain.
3. **Security** — Shared secret token in WebSocket handshake. Cloudflare Tunnel provides TLS. Must document risks clearly.
4. **Session persistence** — Relay server keeps Copilot CLI session alive across browser disconnects/reconnects. Reset only on explicit action.
5. **Mobile responsiveness** — Chat UI should be responsive, but full agent capabilities may be harder on mobile.
