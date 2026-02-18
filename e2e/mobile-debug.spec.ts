import { test, expect } from '@playwright/test';

const TUNNEL_WS_URL = process.env.TUNNEL_WS_URL || 'wss://seekers-psi-concerned-boss.trycloudflare.com/ws';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '5fbc3652ec200d74fba3acb33c8b8d77e2aae5ae704adaa096734f6073bafac8';

test.use({
  browserName: 'chromium',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

test.describe('Mobile Debug Screenshots', () => {

  test('1-initial-load', async ({ page }) => {
    await page.goto('https://moulongzhang.github.io/copilot-web-relay/');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/mobile-01-initial.png', fullPage: true });
    await expect(page.locator('h1')).toContainText('Copilot Web Relay');
  });

  test('2-settings-open', async ({ page }) => {
    await page.goto('https://moulongzhang.github.io/copilot-web-relay/');
    await page.tap('.settings-btn');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/mobile-02-settings-open.png', fullPage: true });
    
    const panel = await page.locator('.settings-panel').boundingBox();
    const viewport = page.viewportSize()!;
    console.log(`Settings panel: ${panel?.width}x${panel?.height} at (${panel?.x},${panel?.y})`);
    console.log(`Viewport: ${viewport.width}x${viewport.height}`);
    console.log(`Panel covers ${((panel?.width || 0) / viewport.width * 100).toFixed(1)}% of width`);
  });

  test('3-settings-save-and-close', async ({ page }) => {
    await page.goto('https://moulongzhang.github.io/copilot-web-relay/');
    await page.tap('.settings-btn');
    await expect(page.locator('.settings-panel')).toBeVisible();
    
    // Fill and save
    await page.fill('.settings-panel input[type="text"]', TUNNEL_WS_URL);
    const tokenInput = page.locator('.settings-panel input[type="password"]');
    await tokenInput.fill(AUTH_TOKEN);
    await page.screenshot({ path: 'test-results/mobile-03a-before-save.png' });
    
    await page.tap('.btn-primary');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/mobile-03b-after-save.png' });
    
    // Check if overlay is gone
    const overlayVisible = await page.locator('.settings-overlay').isVisible();
    console.log(`Overlay still visible after save: ${overlayVisible}`);
    
    // Check if screen is dark
    const bgColor = await page.evaluate(() => {
      const app = document.querySelector('.app');
      return app ? getComputedStyle(app).backgroundColor : 'not found';
    });
    console.log(`App background color: ${bgColor}`);
  });

  test('4-connected-state', async ({ page }) => {
    await page.goto('https://moulongzhang.github.io/copilot-web-relay/');
    await page.evaluate(({ url, token }) => {
      localStorage.setItem('copilot-relay-settings', JSON.stringify({
        tunnelUrl: url, token, theme: 'dark',
      }));
      localStorage.removeItem('copilot-relay-chat-history');
    }, { url: TUNNEL_WS_URL, token: AUTH_TOKEN });
    await page.reload();
    
    try {
      await expect(page.locator('.connection-status.status-connected')).toBeVisible({ timeout: 15000 });
      console.log('Connected successfully');
    } catch {
      console.log('Failed to connect');
    }
    await page.screenshot({ path: 'test-results/mobile-04-connected.png', fullPage: true });
  });

  test('5-chat-with-message', async ({ page }) => {
    await page.goto('https://moulongzhang.github.io/copilot-web-relay/');
    await page.evaluate(({ url, token }) => {
      localStorage.setItem('copilot-relay-settings', JSON.stringify({
        tunnelUrl: url, token, theme: 'dark',
      }));
      localStorage.removeItem('copilot-relay-chat-history');
    }, { url: TUNNEL_WS_URL, token: AUTH_TOKEN });
    await page.reload();
    await expect(page.locator('.connection-status.status-connected')).toBeVisible({ timeout: 15000 });
    
    await page.tap('.input-bar textarea');
    await page.fill('.input-bar textarea', 'Say hello in one word');
    await page.tap('.send-button');
    await expect(page.locator('.message-user')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'test-results/mobile-05a-message-sent.png', fullPage: true });
    
    // Wait for response
    try {
      await expect(page.locator('.message-assistant .message-content')).not.toBeEmpty({ timeout: 30000 });
    } catch { /* timeout ok */ }
    await page.screenshot({ path: 'test-results/mobile-05b-response.png', fullPage: true });
    
    // Check alignment
    const rows = await page.locator('.message-row').all();
    for (const row of rows) {
      const avatar = await row.locator('.message-avatar').boundingBox();
      const body = await row.locator('.message-body').boundingBox();
      const cls = await row.getAttribute('class');
      if (avatar && body) {
        console.log(`${cls}: avatar=(${avatar.x.toFixed(0)},${avatar.y.toFixed(0)}) body=(${body.x.toFixed(0)},${body.y.toFixed(0)}) offset=${(avatar.y - body.y).toFixed(1)}px`);
      }
    }
  });

  test('6-touch-target-sizes', async ({ page }) => {
    await page.goto('https://moulongzhang.github.io/copilot-web-relay/');
    
    const settingsBtn = await page.locator('.settings-btn').boundingBox();
    const sendBtn = await page.locator('.send-button').boundingBox();
    
    console.log(`Settings button: ${settingsBtn?.width}x${settingsBtn?.height}`);
    console.log(`Send button: ${sendBtn?.width}x${sendBtn?.height}`);
    
    expect(Math.min(settingsBtn!.width, settingsBtn!.height)).toBeGreaterThanOrEqual(44);
    expect(Math.min(sendBtn!.width, sendBtn!.height)).toBeGreaterThanOrEqual(40);
  });

  test('7-no-horizontal-scroll', async ({ page }) => {
    await page.goto('https://moulongzhang.github.io/copilot-web-relay/');
    const viewport = page.viewportSize()!;
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    console.log(`Viewport width: ${viewport.width}, scrollWidth: ${scrollWidth}`);
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
  });
});
