import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173/copilot-web-relay/',
      },
      testMatch: /app\.spec\.ts/,
    },
    {
      name: 'mobile',
      use: {
        // Use Chromium with iPhone 14 viewport/touch settings (WebKit not installed)
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        baseURL: 'http://localhost:5173/copilot-web-relay/',
      },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: [
    {
      command: 'cd relay-server && AUTH_TOKEN= npm run dev',
      port: 3100,
      reuseExistingServer: true,
      timeout: 15000,
      env: { AUTH_TOKEN: '' },
    },
    {
      command: 'cd frontend && npm run dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 15000,
    },
  ],
});
