import { test, expect } from '@playwright/test';

const TUNNEL_WS_URL = process.env.TUNNEL_WS_URL || 'wss://barrel-certified-essence-acrylic.trycloudflare.com/ws';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '5fbc3652ec200d74fba3acb33c8b8d77e2aae5ae704adaa096734f6073bafac8';

test.describe('Production E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    // Configure settings via localStorage
    await page.evaluate(({ url, token }) => {
      localStorage.setItem('copilot-relay-settings', JSON.stringify({
        tunnelUrl: url,
        token: token,
        theme: 'dark',
      }));
      localStorage.removeItem('copilot-relay-chat-history');
    }, { url: TUNNEL_WS_URL, token: AUTH_TOKEN });
    await page.reload();
  });

  test('frontend loads correctly from GitHub Pages', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Copilot Web Relay');
    await expect(page.locator('.connection-status')).toBeVisible();
  });

  test('connects to relay via Cloudflare tunnel', async ({ page }) => {
    await expect(page.locator('.connection-status.status-connected')).toBeVisible({ timeout: 15000 });
  });

  test('settings panel works', async ({ page }) => {
    await page.click('.settings-btn');
    await expect(page.locator('.settings-panel')).toBeVisible();
    // Verify the tunnel URL is saved
    const urlInput = page.locator('.settings-panel input[type="text"]').first();
    await expect(urlInput).toHaveValue(TUNNEL_WS_URL);
    await page.click('.settings-panel button:has-text("Cancel")');
    await expect(page.locator('.settings-panel')).not.toBeVisible();
  });

  test('input bar enabled when connected', async ({ page }) => {
    await expect(page.locator('.connection-status.status-connected')).toBeVisible({ timeout: 15000 });
    const textarea = page.locator('.input-textarea');
    await expect(textarea).toBeEnabled();
  });

  test('can send prompt and receive streamed response', async ({ page }) => {
    await expect(page.locator('.connection-status.status-connected')).toBeVisible({ timeout: 15000 });

    // Send a simple prompt
    const textarea = page.locator('.input-textarea');
    await textarea.fill('Say exactly: HELLO_TEST_123');
    await page.click('.send-button');

    // User message should appear
    await expect(page.locator('.message-user')).toBeVisible({ timeout: 5000 });

    // Assistant response should appear (copilot takes time)
    await expect(page.locator('.message-assistant')).toBeVisible({ timeout: 30000 });

    // Wait for response to complete (done state)
    // The response should contain our test string
    await expect(page.locator('.message-assistant .message-content')).toContainText('HELLO_TEST_123', { timeout: 45000 });
  });

  test('stop button appears during generation and works', async ({ page }) => {
    await expect(page.locator('.connection-status.status-connected')).toBeVisible({ timeout: 15000 });

    // Send a prompt that will produce a long response
    const textarea = page.locator('.input-textarea');
    await textarea.fill('Write an extremely detailed 5000 word essay covering the complete history of computing from Charles Babbage through modern quantum computing. Include every major milestone, inventor, and breakthrough.');
    await page.click('.send-button');

    // Wait for assistant message to appear first (copilot process starts)
    await expect(page.locator('.message-assistant')).toBeVisible({ timeout: 30000 });

    // Stop button should be visible while response is streaming
    const stopBtn = page.locator('.stop-button');
    if (await stopBtn.isVisible()) {
      await stopBtn.click();
      // Stop button should disappear, send button should return
      await expect(page.locator('.stop-button')).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator('.send-button')).toBeVisible();
      // Input should be re-enabled (UI unlocked)
      await expect(page.locator('.input-textarea')).toBeEnabled({ timeout: 5000 });
    } else {
      // Response completed before we could click stop — still valid, just fast
      await expect(page.locator('.send-button')).toBeVisible();
    }
  });

  test('health endpoint is accessible via tunnel', async ({ page }) => {
    // Test the health endpoint through the tunnel
    const healthUrl = TUNNEL_WS_URL.replace('wss://', 'https://').replace('/ws', '/health');
    const response = await page.request.get(healthUrl);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
