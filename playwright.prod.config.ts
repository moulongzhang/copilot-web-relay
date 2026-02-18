import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'prod.spec.ts',
  timeout: 60000,
  projects: [
    {
      name: 'prod-desktop',
      use: {
        baseURL: 'https://moulongzhang.github.io/copilot-web-relay/',
        headless: true,
      },
    },
    {
      name: 'prod-mobile',
      use: {
        baseURL: 'https://moulongzhang.github.io/copilot-web-relay/',
        headless: true,
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
    },
  ],
  // No webServer - we expect relay+tunnel to be running externally
});
