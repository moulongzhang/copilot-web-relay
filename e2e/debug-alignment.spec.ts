import { test, expect } from '@playwright/test';

test('capture chat layout for alignment check', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('copilot-relay-settings', JSON.stringify({
      tunnelUrl: 'ws://localhost:3100/ws', token: '', theme: 'dark',
    }));
    localStorage.removeItem('copilot-relay-chat-history');
  });
  await page.reload();
  await expect(page.locator('.connection-status.status-connected')).toBeVisible({ timeout: 10000 });

  // Send a message to create user + assistant bubbles
  await page.fill('.input-bar textarea', 'Hello, tell me about TypeScript');
  await page.click('.send-button');
  await page.waitForSelector('.message-avatar img', { timeout: 5000 });

  // Wait a moment for assistant typing indicator to show
  await page.waitForTimeout(500);

  // Get bounding boxes to check alignment
  const rows = await page.locator('.message-row').all();
  for (const row of rows) {
    const avatarBox = await row.locator('.message-avatar').boundingBox();
    const bodyBox = await row.locator('.message-body').boundingBox();
    const cls = await row.getAttribute('class');
    console.log(`--- ${cls} ---`);
    console.log(`  avatar: top=${avatarBox?.y?.toFixed(1)} left=${avatarBox?.x?.toFixed(1)} h=${avatarBox?.height?.toFixed(1)} w=${avatarBox?.width?.toFixed(1)}`);
    console.log(`  body:   top=${bodyBox?.y?.toFixed(1)} left=${bodyBox?.x?.toFixed(1)} h=${bodyBox?.height?.toFixed(1)}`);
    if (avatarBox && bodyBox) {
      console.log(`  OFFSET: avatar.top - body.top = ${(avatarBox.y - bodyBox.y).toFixed(1)}px`);
    }
  }

  // Check typing indicator position
  const typing = page.locator('.typing-indicator');
  if (await typing.count() > 0) {
    const typingBox = await typing.first().boundingBox();
    console.log(`\n--- typing indicator ---`);
    console.log(`  position: top=${typingBox?.y?.toFixed(1)} left=${typingBox?.x?.toFixed(1)} h=${typingBox?.height?.toFixed(1)}`);
    const parentBody = page.locator('.message-assistant .message-body');
    const parentBox = await parentBody.boundingBox();
    console.log(`  parent body: top=${parentBox?.y?.toFixed(1)} left=${parentBox?.x?.toFixed(1)}`);
  }

  // Take screenshot
  await page.screenshot({ path: 'test-results/alignment-check.png', fullPage: true });
  console.log('\nScreenshot saved to test-results/alignment-check.png');
});
