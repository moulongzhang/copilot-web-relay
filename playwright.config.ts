import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173/copilot-web-relay/',
    headless: true,
  },
  webServer: [
    {
      command: 'cd relay-server && npm run dev',
      port: 3100,
      reuseExistingServer: true,
      timeout: 10000,
    },
    {
      command: 'cd frontend && npm run dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 10000,
    },
  ],
});
