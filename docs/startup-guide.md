# Copilot Web Relay スタートアップガイド

## 概要 (Overview)

このアプリケーションは以下の3つのコンポーネントで構成されています：

| コンポーネント | 説明 | 実行場所 |
|---|---|---|
| **Frontend** | ChatGPT風のWebチャットUI | GitHub Pages（デプロイ済み） |
| **Relay Server** | WebSocketリレーサーバー（Copilot CLIへの橋渡し） | ローカルNode.js |
| **Cloudflare Tunnel** | ローカルサーバーを外部公開するトンネル | ローカル（任意） |

フロントエンドは既にデプロイ済みです：  
👉 https://moulongzhang.github.io/copilot-web-relay/

---

## 前提条件 (Prerequisites)

- **Node.js 18+** がインストールされていること
- **GitHub Copilot CLI** がインストールされていること（`/opt/homebrew/bin/copilot` で利用可能）
- **cloudflared** がインストールされていること（`brew install cloudflared`）— ローカルのみで使う場合は不要
- **プロジェクトの依存関係** がインストールされていること：

```bash
cd /Users/williamzhang/Documents/Temp/copilot-web-relay
npm install
```

---

## Step 1: リレーサーバー起動 (Start Relay Server)

### Option A — 開発モード（ホットリロード付き）

```bash
cd /Users/williamzhang/Documents/Temp/copilot-web-relay
npm run dev:relay
```

### Option B — 本番モード

```bash
cd /Users/williamzhang/Documents/Temp/copilot-web-relay
npm run build:relay && npm run start:relay
```

サーバーは `http://localhost:3100` で起動します。

| エンドポイント | URL |
|---|---|
| ヘルスチェック | http://localhost:3100/health |
| WebSocket | ws://localhost:3100/ws |

---

## Step 2: Cloudflareトンネル起動 (Start Tunnel) — 任意

外部からアクセスする必要がある場合のみ実行してください。

### クイックトンネル（一時的なURL）

```bash
cloudflared tunnel --url http://localhost:3100
```

コマンド実行後、`*.trycloudflare.com` 形式のURLが出力されます。

### ネームドトンネル（事前設定済みの場合）

```bash
cloudflared tunnel run copilot-relay
```

### オールインワンスクリプト

リレーサーバーとトンネルを同時に起動します：

```bash
./scripts/start-relay.sh
```

---

## Step 3: フロントエンド接続 (Connect Frontend)

1. ブラウザで https://moulongzhang.github.io/copilot-web-relay/ を開く
2. 設定アイコン（⚙️）をクリック
3. リレーサーバーのURLを入力：
   - **ローカル接続の場合：** `ws://localhost:3100/ws`
   - **トンネル経由の場合：** `wss://<トンネルURL>/ws`
4. Auth Tokenを入力：
   ```
   5fbc3652ec200d74fba3acb33c8b8d77e2aae5ae704adaa096734f6073bafac8
   ```
5. **Save** をクリック

---

## 動作確認 (Verification)

### ヘルスチェック

```bash
curl http://localhost:3100/health
```

### WebSocket接続テスト

```bash
node -e "const ws = new (require('ws'))('ws://localhost:3100/ws', ['5fbc3652ec200d74fba3acb33c8b8d77e2aae5ae704adaa096734f6073bafac8']); ws.on('open', () => { console.log('Connected!'); ws.close(); });"
```

`Connected!` と表示されれば正常に接続できています。

---

## トラブルシューティング (Troubleshooting)

| 問題 | 対処法 |
|---|---|
| ポート3100が使用中 | `lsof -ti:3100` でPIDを確認し、`kill <PID>` で停止 |
| Copilot CLIが見つからない | PATHを確認し、`/opt/homebrew/bin/copilot` が存在するか確認 |
| WebSocket認証エラー | `relay-server/.env` の `AUTH_TOKEN` がフロントエンドの設定と一致しているか確認 |
| Copilotから応答がない | `copilot auth status` で認証状態を確認 |

---

## 停止方法 (Shutdown)

- リレーサーバーが動作しているターミナルで **Ctrl+C** を押す
- `start-relay.sh` を使用している場合は、**Ctrl+C** でリレーサーバーとトンネルの両方が停止します
