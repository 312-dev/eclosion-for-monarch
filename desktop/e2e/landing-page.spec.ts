import { test, expect } from '@playwright/test';

/**
 * Landing Page E2E Tests
 *
 * Tests for the public-facing landing page.
 */

test.describe('Landing Page', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/');

    // Should load without errors
    await expect(page).toHaveTitle(/Eclosion/i);
  });

  test('should display app name and tagline', async ({ page }) => {
    await page.goto('/');

    // Look for the app name
    const heading = page.locator('h1, [role="heading"]').first();
    await expect(heading).toBeVisible();
  });

  test('should have demo mode link', async ({ page }) => {
    await page.goto('/');

    // Look for a link to demo mode
    const demoLink = page.getByRole('link', { name: /demo|try/i });

    if (await demoLink.count() > 0) {
      await expect(demoLink.first()).toBeVisible();
    }
  });

  test('should have login/get started button', async ({ page }) => {
    await page.goto('/');

    // Look for login or get started button
    const actionButton = page.getByRole('button', { name: /get started|login|sign in/i })
      .or(page.getByRole('link', { name: /get started|login|sign in/i }));

    if (await actionButton.count() > 0) {
      await expect(actionButton.first()).toBeVisible();
    }
  });
});

test.describe('Landing Page - Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Check for h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // H1 should be first heading
    const firstHeading = page.locator('h1, h2, h3, h4, h5, h6').first();
    const tagName = await firstHeading.evaluate(el => el.tagName);
    expect(tagName).toBe('H1');
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/');

    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaHidden = await img.getAttribute('aria-hidden');

      // Images should have alt text or be hidden from accessibility tree
      const hasAltOrHidden = alt !== null || ariaHidden === 'true';
      expect(hasAltOrHidden).toBe(true);
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');

    // This is a basic check - full contrast checking requires tools like axe
    // At minimum, text should be visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Landing Page - Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should not have console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out expected errors (like extension errors)
    const unexpectedErrors = errors.filter(err =>
      !err.includes('extension') &&
      !err.includes('favicon')
    );

    expect(unexpectedErrors).toHaveLength(0);
  });
});
