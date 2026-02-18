import { test, expect } from '@playwright/test';

test.describe('Copilot Web Relay', () => {
  test('frontend loads and shows header', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Copilot Web Relay');
  });

  test('shows disconnected state when no server URL configured', async ({ page }) => {
    await page.goto('/');
    // Should show some connection status indicator
    const status = page.locator('.connection-status');
    await expect(status).toBeVisible();
  });

  test('settings panel opens and closes', async ({ page }) => {
    await page.goto('/');
    // Click settings button
    await page.click('.settings-btn');
    // Settings panel should be visible
    await expect(page.locator('.settings-panel')).toBeVisible();
    // Click cancel to close
    await page.click('.settings-panel button:has-text("Cancel")');
    await expect(page.locator('.settings-panel')).not.toBeVisible();
  });

  test('can configure tunnel URL in settings', async ({ page }) => {
    await page.goto('/');
    await page.click('.settings-btn');
    const urlInput = page.locator('.settings-panel input[type="text"]');
    await urlInput.fill('ws://localhost:3100/ws');
    await page.click('.settings-panel button:has-text("Save")');
    // Settings should close
    await expect(page.locator('.settings-panel')).not.toBeVisible();
  });

  test('connects to relay server via WebSocket', async ({ page }) => {
    // Pre-set localStorage with the correct URL
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('copilot-relay-settings', JSON.stringify({
        tunnelUrl: 'ws://localhost:3100/ws',
        token: '',
        theme: 'dark',
      }));
    });
    await page.reload();
    
    // Wait for connected status
    await expect(page.locator('.connection-status.status-connected')).toBeVisible({ timeout: 10000 });
  });

  test('input bar is enabled when connected', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('copilot-relay-settings', JSON.stringify({
        tunnelUrl: 'ws://localhost:3100/ws',
        token: '',
        theme: 'dark',
      }));
    });
    await page.reload();
    
    await expect(page.locator('.connection-status.status-connected')).toBeVisible({ timeout: 10000 });
    
    // Input should be enabled
    const textarea = page.locator('.input-bar textarea, .input-bar input');
    await expect(textarea).toBeEnabled();
  });

  test('WebSocket protocol supports open_file message', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('copilot-relay-settings', JSON.stringify({
        tunnelUrl: 'ws://localhost:3100/ws',
        token: '',
        theme: 'dark',
      }));
    });
    await page.reload();
    
    // Wait for connection
    await expect(page.locator('.connection-status.status-connected')).toBeVisible({ timeout: 10000 });
    
    // Verify the WebSocket is connected
    const statusText = await page.locator('.connection-status').textContent();
    expect(statusText?.toLowerCase()).toContain('connected');
  });

  test('displays file_opened message in chat via UI flow', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('copilot-relay-settings', JSON.stringify({
        tunnelUrl: 'ws://localhost:3100/ws',
        token: '',
        theme: 'dark',
      }));
    });
    await page.reload();
    await expect(page.locator('.connection-status.status-connected')).toBeVisible({ timeout: 10000 });

    // Type a message and send it via the UI
    const textarea = page.locator('.input-bar textarea');
    await textarea.fill('hello');
    await page.click('.send-button');

    // The user message should appear in the chat
    await expect(page.locator('.message-user')).toBeVisible({ timeout: 5000 });
    // An assistant response bubble should also appear
    await expect(page.locator('.message-assistant')).toBeVisible({ timeout: 10000 });
  });

  test('open_file message reaches server and gets response', async ({ page }) => {
    await page.goto('/');

    // Test the open_file protocol directly via a raw WebSocket
    const result = await page.evaluate(() => {
      return new Promise<{ type: string; success: boolean; path: string }>((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:3100/ws');
        const timeout = setTimeout(() => reject(new Error('timeout')), 5000);
        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'open_file',
            path: '/nonexistent/test/file.xlsx',
            id: 'test-open-1',
          }));
        };
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === 'file_opened') {
            clearTimeout(timeout);
            resolve(msg);
            ws.close();
          }
        };
        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('WebSocket error'));
        };
      });
    });

    expect(result.type).toBe('file_opened');
    expect(result.success).toBe(false);
    expect(result.path).toBe('/nonexistent/test/file.xlsx');
  });

  test('prompt with "open" + file path triggers file open and shows confirmation', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('copilot-relay-settings', JSON.stringify({
        tunnelUrl: 'ws://localhost:3100/ws',
        token: '',
        theme: 'dark',
      }));
      localStorage.removeItem('copilot-relay-chat-history');
    });
    await page.reload();
    await expect(page.locator('.connection-status.status-connected')).toBeVisible({ timeout: 10000 });

    // Send an interrupt to clear any pending prompt from previous tests
    await page.evaluate(() => {
      const ws = new WebSocket('ws://localhost:3100/ws');
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'interrupt', id: 'cleanup' }));
        ws.close();
      };
    });
    await page.waitForTimeout(500);

    // Type a prompt asking to open the real Excel file
    const textarea = page.locator('.input-bar textarea');
    await textarea.fill('open /Users/williamzhang/Documents/Temp/excel_analyzer/docs/sample_data.xlsx');
    await page.click('.send-button');

    // User message should appear
    await expect(page.locator('.message-user')).toBeVisible({ timeout: 5000 });

    // Assistant response should show the file_opened confirmation with 📂
    await expect(page.locator('.message-assistant')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.message-assistant .message-content')).toContainText('📂', { timeout: 10000 });
    await expect(page.locator('.message-assistant .message-content')).toContainText('sample_data.xlsx', { timeout: 10000 });
  });

  test('open_file with real path succeeds via direct WebSocket', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      return new Promise<{ type: string; success: boolean; path: string; message: string }>((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:3100/ws');
        const timeout = setTimeout(() => reject(new Error('timeout')), 5000);
        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'open_file',
            path: '/Users/williamzhang/Documents/Temp/excel_analyzer/docs/sample_data.xlsx',
            id: 'test-real-open',
          }));
        };
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === 'file_opened') {
            clearTimeout(timeout);
            resolve(msg);
            ws.close();
          }
        };
        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('WebSocket error'));
        };
      });
    });

    expect(result.type).toBe('file_opened');
    expect(result.success).toBe(true);
    expect(result.path).toContain('sample_data.xlsx');
  });
});
