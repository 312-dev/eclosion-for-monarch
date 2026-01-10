/**
 * Screenshot generation configuration
 */

import type { ScreenshotConfig, ViewportConfig, FrameConfig } from './types.js';

/**
 * Screenshots to capture
 */
export const SCREENSHOTS: ScreenshotConfig[] = [
  {
    name: 'Dashboard',
    url: '/demo/dashboard',
    filename: 'screenshot-dashboard.png',
    waitForSelector: '[data-testid="dashboard-content"]',
    delay: 500,
  },
  {
    name: 'Recurring Expenses',
    url: '/demo/recurring',
    filename: 'screenshot-recurring.png',
    waitForSelector: '[data-testid="recurring-content"]',
    delay: 800, // Slightly longer for charts to render
  },
  {
    name: 'Settings',
    url: '/demo/settings',
    filename: 'screenshot-settings.png',
    waitForSelector: '[data-testid="settings-content"]',
    delay: 500,
  },
];

/**
 * Viewport configuration for screenshots
 * Using 2x scale for retina-quality output
 */
export const VIEWPORT: ViewportConfig = {
  width: 1440,
  height: 900,
  deviceScaleFactor: 2,
};

/**
 * macOS window frame configuration
 * Values are scaled for 2x resolution
 */
export const FRAME: FrameConfig = {
  titleBarHeight: 56,
  borderRadius: 20,
  titleBarColor: '#2d2d44',
  trafficLights: {
    y: 28, // Center vertically in title bar
    startX: 40,
    spacing: 40, // Center-to-center distance (diameter 24 + 16px gap)
    radius: 12,
    colors: {
      close: '#ff5f57',
      minimize: '#ffbd2e',
      maximize: '#27c93f',
    },
  },
};

/**
 * Page zoom level for screenshots (1.0 = 100%, 1.35 = 135%)
 */
export const PAGE_ZOOM = 1.35;

/**
 * Output directory for generated screenshots
 */
export const OUTPUT_DIR = 'output';

/**
 * Default base URL for local preview server
 */
export const DEFAULT_BASE_URL = 'http://localhost:4173';
