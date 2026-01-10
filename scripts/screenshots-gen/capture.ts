/**
 * Screenshot capture using Playwright
 */

import { chromium } from 'playwright';
import { SCREENSHOTS, VIEWPORT, PAGE_ZOOM } from './config.js';
import type { ScreenshotConfig } from './types.js';

/**
 * Capture screenshots from all configured pages
 * @param baseUrl Base URL of the running app
 * @returns Map of filename to screenshot buffer
 */
export async function captureScreenshots(baseUrl: string): Promise<Map<string, Buffer>> {
  console.log('\nLaunching browser...');

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: {
      width: VIEWPORT.width,
      height: VIEWPORT.height,
    },
    deviceScaleFactor: VIEWPORT.deviceScaleFactor,
    // Prefer dark color scheme to match app theme
    colorScheme: 'dark',
  });

  const results = new Map<string, Buffer>();

  for (const config of SCREENSHOTS) {
    try {
      const buffer = await captureOne(context, baseUrl, config);
      results.set(config.filename, buffer);
    } catch (error) {
      console.error(`  Failed to capture ${config.name}:`, error);
    }
  }

  await browser.close();
  console.log('Browser closed.\n');

  return results;
}

/**
 * Capture a single screenshot
 */
async function captureOne(
  context: Awaited<ReturnType<typeof chromium.launch>>['contexts'][0] extends never
    ? never
    : Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newContext']>>,
  baseUrl: string,
  config: ScreenshotConfig
): Promise<Buffer> {
  console.log(`  Capturing: ${config.name}...`);

  const page = await context.newPage();

  try {
    const url = `${baseUrl}${config.url}`;
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for the target element if specified
    if (config.waitForSelector) {
      await page.waitForSelector(config.waitForSelector, {
        timeout: 10000,
        state: 'visible',
      });
    }

    // Dismiss any open tour tooltips/modals
    await dismissTourElements(page);

    // Apply zoom to page content for better visibility
    if (PAGE_ZOOM !== 1) {
      await page.evaluate((zoom) => {
        document.body.style.transform = `scale(${zoom})`;
        document.body.style.transformOrigin = 'top left';
        document.body.style.width = `${100 / zoom}%`;
        document.body.style.height = `${100 / zoom}%`;
      }, PAGE_ZOOM);
    }

    // Additional delay for animations/charts to settle
    if (config.delay) {
      await page.waitForTimeout(config.delay);
    }

    // Capture the screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      // Capture full page or just viewport
      fullPage: false,
    });

    console.log(`    -> ${config.filename}`);
    return screenshot;

  } finally {
    await page.close();
  }
}

/**
 * Dismiss any open tour tooltips, modals, or overlays
 * This ensures clean screenshots without UI guides
 */
async function dismissTourElements(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newContext']>>['pages'][0] extends never ? never : Awaited<ReturnType<Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newContext']>>['newPage']>>): Promise<void> {
  try {
    // Try multiple strategies to dismiss tour elements

    // Strategy 1: Click any visible tour close buttons (Shepherd.js pattern)
    const closeButton = page.locator('[class*="shepherd"] button[aria-label="Close"], [class*="tour"] button[aria-label="Close"], [class*="shepherd-cancel-icon"], button.shepherd-cancel-icon');
    if (await closeButton.first().isVisible({ timeout: 500 }).catch(() => false)) {
      await closeButton.first().click();
      await page.waitForTimeout(300); // Wait for close animation
    }

    // Strategy 2: Press Escape key to dismiss any open modals/tooltips
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Strategy 3: Click outside any modal overlay
    const overlay = page.locator('[class*="shepherd-modal-overlay"], [class*="tour-overlay"]');
    if (await overlay.isVisible({ timeout: 200 }).catch(() => false)) {
      // Click on the main content area to dismiss
      await page.click('body', { position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);
    }

  } catch {
    // Silently ignore - no tour elements to dismiss
  }
}
