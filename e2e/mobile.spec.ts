import { test, expect } from '@playwright/test';

test.describe('Mobile UI', () => {

  test('settings overlay closes after save', async ({ page }) => {
    await page.goto('/');
    await page.tap('.settings-btn');
    await expect(page.locator('.settings-panel')).toBeVisible();

    // Fill URL and save
    await page.fill('.settings-panel input[type="text"]', 'ws://localhost:3100/ws');
    await page.tap('.btn-primary');

    // Overlay must disappear — no dark screen
    await expect(page.locator('.settings-overlay')).not.toBeVisible({ timeout: 3000 });

    // Verify page is not dark (check that main app content is visible)
    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('.input-bar')).toBeVisible();
  });

  test('no horizontal scroll on mobile viewport', async ({ page }) => {
    await page.goto('/');
    const viewport = page.viewportSize()!;
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
  });

  test('can send message via touch', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('copilot-relay-settings', JSON.stringify({
        tunnelUrl: 'ws://localhost:3100/ws', token: '', theme: 'dark',
      }));
      localStorage.removeItem('copilot-relay-chat-history');
    });
    await page.reload();
    await expect(page.locator('.connection-status.status-connected')).toBeVisible({ timeout: 10000 });

    // Type and send via touch
    await page.tap('.input-bar textarea');
    await page.fill('.input-bar textarea', 'hello mobile');
    await page.tap('.send-button');

    // User message should appear
    await expect(page.locator('.message-user')).toBeVisible({ timeout: 5000 });
    // Assistant response should appear
    await expect(page.locator('.message-assistant')).toBeVisible({ timeout: 10000 });
  });

  test('settings button has adequate touch target', async ({ page }) => {
    await page.goto('/');
    const btn = await page.locator('.settings-btn').boundingBox();
    expect(btn).toBeTruthy();
    expect(Math.min(btn!.width, btn!.height)).toBeGreaterThanOrEqual(44);
  });

  test('send button has adequate touch target', async ({ page }) => {
    await page.goto('/');
    const btn = await page.locator('.send-button').boundingBox();
    expect(btn).toBeTruthy();
    expect(Math.min(btn!.width, btn!.height)).toBeGreaterThanOrEqual(40);
  });

  test('settings panel is full-screen on mobile', async ({ page }) => {
    await page.goto('/');
    await page.tap('.settings-btn');
    await expect(page.locator('.settings-panel')).toBeVisible();

    const viewport = page.viewportSize()!;
    const panel = await page.locator('.settings-panel').boundingBox();
    expect(panel).toBeTruthy();
    // Panel should cover at least 95% of viewport width
    expect(panel!.width).toBeGreaterThanOrEqual(viewport.width * 0.95);
  });

  test('avatar and message text are aligned', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('copilot-relay-settings', JSON.stringify({
        tunnelUrl: 'ws://localhost:3100/ws', token: '', theme: 'dark',
      }));
      localStorage.removeItem('copilot-relay-chat-history');
    });
    await page.reload();
    await expect(page.locator('.connection-status.status-connected')).toBeVisible({ timeout: 10000 });

    // Send a message to get avatars rendered
    await page.fill('.input-bar textarea', 'test alignment');
    await page.tap('.send-button');
    await page.waitForSelector('.message-avatar img', { timeout: 5000 });

    // Check user message alignment
    const userRow = page.locator('.message-user');
    const avatar = await userRow.locator('.message-avatar').boundingBox();
    const body = await userRow.locator('.message-body').boundingBox();
    expect(avatar).toBeTruthy();
    expect(body).toBeTruthy();
    // Avatar top should be close to body top (within 5px)
    expect(Math.abs(avatar!.y - body!.y)).toBeLessThanOrEqual(5);
  });

  test('header fits within viewport', async ({ page }) => {
    await page.goto('/');
    const viewport = page.viewportSize()!;
    const header = await page.locator('.app-header').boundingBox();
    expect(header).toBeTruthy();
    expect(header!.width).toBeLessThanOrEqual(viewport.width);
    expect(header!.x).toBeGreaterThanOrEqual(0);
  });

  test('messages fit within viewport width', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('copilot-relay-settings', JSON.stringify({
        tunnelUrl: 'ws://localhost:3100/ws', token: '', theme: 'dark',
      }));
      localStorage.removeItem('copilot-relay-chat-history');
    });
    await page.reload();
    await expect(page.locator('.connection-status.status-connected')).toBeVisible({ timeout: 10000 });

    await page.fill('.input-bar textarea', 'This is a test message to check width');
    await page.tap('.send-button');
    await expect(page.locator('.message-user')).toBeVisible({ timeout: 5000 });

    const viewport = page.viewportSize()!;
    const msgBox = await page.locator('.message-user').boundingBox();
    expect(msgBox).toBeTruthy();
    expect(msgBox!.x + msgBox!.width).toBeLessThanOrEqual(viewport.width);
  });

});
