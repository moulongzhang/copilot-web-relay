import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'prod.spec.ts',
  timeout: 60000,
  use: {
    baseURL: 'https://moulongzhang.github.io/copilot-web-relay/',
    headless: true,
  },
  // No webServer - we expect relay+tunnel to be running externally
});
