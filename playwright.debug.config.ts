import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'mobile-debug.spec.ts',
  timeout: 60000,
});
