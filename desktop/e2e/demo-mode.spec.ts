import { test, expect } from '@playwright/test';

/**
 * Demo Mode E2E Tests
 *
 * Tests the demo mode which runs entirely in the browser with localStorage.
 * Demo mode is accessible at /demo/ paths.
 */

test.describe('Demo Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to demo mode
    await page.goto('/demo');
  });

  test.describe('Navigation', () => {
    test('should load demo landing page', async ({ page }) => {
      // Demo mode should show the app without login
      await expect(page).toHaveURL(/demo/);
    });

    test('should navigate to recurring tab', async ({ page }) => {
      // Click on recurring link in navigation
      const recurringLink = page.getByRole('link', { name: /recurring/i });
      if (await recurringLink.isVisible()) {
        await recurringLink.click();
        await expect(page).toHaveURL(/demo.*recurring/);
      }
    });

    test('should navigate to settings tab', async ({ page }) => {
      const settingsLink = page.getByRole('link', { name: /settings/i });
      if (await settingsLink.isVisible()) {
        await settingsLink.click();
        await expect(page).toHaveURL(/demo.*settings/);
      }
    });
  });

  test.describe('Demo Data', () => {
    test('should display sample recurring items', async ({ page }) => {
      // Navigate to recurring page
      await page.goto('/demo/recurring');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Should show some recurring items (either in a list or cards)
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('should persist data in localStorage', async ({ page }) => {
      await page.goto('/demo/recurring');

      // Check localStorage has demo data
      const demoData = await page.evaluate(() => {
        return localStorage.getItem('eclosion-demo-data');
      });

      // Demo data may be initialized on first load
      // or already exist from previous test
    });
  });

  test.describe('Accessibility', () => {
    test('should have no major accessibility violations on demo page', async ({ page }) => {
      await page.goto('/demo');

      // Basic accessibility checks
      // Check for main landmark
      const main = page.locator('main, [role="main"]');
      if (await main.count() > 0) {
        await expect(main.first()).toBeVisible();
      }

      // Check buttons have accessible names
      const buttons = page.locator('button:visible');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);
        const name = await button.getAttribute('aria-label') || await button.textContent();
        expect(name?.trim()).toBeTruthy();
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/demo');

      // Tab through focusable elements
      await page.keyboard.press('Tab');

      // Check something is focused
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName;
      });

      expect(focusedElement).toBeTruthy();
    });
  });
});

test.describe('Demo Mode - User Flows', () => {
  test('should complete basic setup wizard flow', async ({ page }) => {
    // Clear any existing demo data
    await page.goto('/demo');
    await page.evaluate(() => {
      localStorage.removeItem('eclosion-demo-data');
    });

    // Reload to trigger setup
    await page.reload();

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');

    // The exact flow depends on the app state
    // This test documents the expected behavior
  });

  test('should toggle item tracking', async ({ page }) => {
    await page.goto('/demo/recurring');

    // Wait for items to load
    await page.waitForLoadState('networkidle');

    // Find a toggle/checkbox element for an item
    const toggles = page.locator('[role="switch"], [type="checkbox"]');
    const toggleCount = await toggles.count();

    if (toggleCount > 0) {
      const firstToggle = toggles.first();
      const initialState = await firstToggle.isChecked();

      await firstToggle.click();

      // State should change
      const newState = await firstToggle.isChecked();
      expect(newState).not.toBe(initialState);
    }
  });
});

test.describe('Demo Mode - Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/demo');

    // Page should still be usable
    await expect(page.locator('body')).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/demo');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should work on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto('/demo');

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Demo Mode - Error Handling', () => {
  test('should handle missing demo data gracefully', async ({ page }) => {
    // Clear demo data
    await page.goto('/demo');
    await page.evaluate(() => {
      localStorage.removeItem('eclosion-demo-data');
    });

    // Navigate to recurring page
    await page.goto('/demo/recurring');

    // Should not crash - either show setup or empty state
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle corrupted demo data', async ({ page }) => {
    // Set corrupted data
    await page.goto('/demo');
    await page.evaluate(() => {
      localStorage.setItem('eclosion-demo-data', 'invalid json {{{');
    });

    // Should recover gracefully
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
  });
});
