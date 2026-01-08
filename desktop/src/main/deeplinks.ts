/**
 * Deep Linking Protocol Handler
 *
 * Registers and handles the `eclosion://` protocol for opening the app
 * from external links or automations.
 *
 * Supported URLs:
 * - eclosion://open          - Show the main window
 * - eclosion://recurring     - Navigate to Recurring tab
 * - eclosion://settings      - Navigate to Settings tab
 * - eclosion://sync          - Trigger a sync
 * - eclosion://settings/desktop - Navigate to Desktop settings section
 */

import { app } from 'electron';
import { getMainWindow, showWindow } from './window';
import { debugLog } from './logger';

const PROTOCOL = 'eclosion';

/**
 * Valid deep link paths and their descriptions.
 */
export const DEEP_LINK_PATHS = {
  open: 'Show the main window',
  recurring: 'Navigate to Recurring tab',
  settings: 'Navigate to Settings tab',
  'settings/desktop': 'Navigate to Desktop settings',
  'settings/advanced': 'Navigate to Advanced settings',
  sync: 'Trigger a sync',
} as const;

export type DeepLinkPath = keyof typeof DEEP_LINK_PATHS;

/**
 * Callback for sync action.
 */
let syncCallback: (() => Promise<void>) | null = null;

/**
 * Parse a deep link URL into its path components.
 */
function parseDeepLink(url: string): { path: string; params: URLSearchParams } | null {
  try {
    // Handle both formats:
    // - eclosion://path
    // - eclosion:path (Windows may strip slashes)
    let normalizedUrl = url;
    if (url.startsWith(`${PROTOCOL}:`) && !url.startsWith(`${PROTOCOL}://`)) {
      normalizedUrl = url.replace(`${PROTOCOL}:`, `${PROTOCOL}://`);
    }

    const parsed = new URL(normalizedUrl);
    const path = parsed.hostname + parsed.pathname.replace(/^\//, '');
    const params = parsed.searchParams;

    return { path: path || 'open', params };
  } catch (error) {
    debugLog(`Failed to parse deep link: ${url} - ${error}`);
    return null;
  }
}

/**
 * Handle a deep link URL.
 */
export async function handleDeepLink(url: string): Promise<void> {
  debugLog(`Handling deep link: ${url}`);

  const parsed = parseDeepLink(url);
  if (!parsed) {
    debugLog('Invalid deep link URL');
    return;
  }

  const { path } = parsed;
  debugLog(`Deep link path: ${path}`);

  switch (path) {
    case 'open':
      showWindow();
      break;

    case 'recurring':
      showWindow();
      navigateToPath('/recurring');
      break;

    case 'settings':
      showWindow();
      navigateToPath('/settings');
      break;

    case 'settings/desktop':
      showWindow();
      navigateToPath('/settings?section=desktop');
      break;

    case 'settings/advanced':
      showWindow();
      navigateToPath('/settings?section=advanced');
      break;

    case 'sync':
      if (syncCallback) {
        await syncCallback();
      }
      break;

    default:
      debugLog(`Unknown deep link path: ${path}`);
      // Default to showing the window
      showWindow();
  }
}

/**
 * Navigate to a path in the renderer.
 */
function navigateToPath(path: string): void {
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send('navigate', path);
  }
}

/**
 * Register the deep link protocol with the OS.
 * Returns true if registration was successful.
 */
export function registerDeepLinkProtocol(): boolean {
  // On macOS, the protocol is registered in the app's Info.plist (handled by electron-builder)
  // On Windows and Linux, we need to register programmatically
  if (process.platform !== 'darwin') {
    const success = app.setAsDefaultProtocolClient(PROTOCOL);
    debugLog(`Deep link protocol registration: ${success ? 'success' : 'failed'}`);
    return success;
  }

  debugLog('Deep link protocol: macOS uses Info.plist registration');
  return true;
}

/**
 * Unregister the deep link protocol.
 */
export function unregisterDeepLinkProtocol(): boolean {
  if (process.platform !== 'darwin') {
    const success = app.removeAsDefaultProtocolClient(PROTOCOL);
    debugLog(`Deep link protocol unregistration: ${success ? 'success' : 'failed'}`);
    return success;
  }
  return true;
}

/**
 * Set up deep link handling for the second-instance event.
 * This handles links opened when the app is already running.
 */
export function setupDeepLinkHandlers(onSync: () => Promise<void>): void {
  syncCallback = onSync;

  // Handle protocol URLs on macOS
  app.on('open-url', (event, url) => {
    event.preventDefault();
    debugLog(`open-url event: ${url}`);
    void handleDeepLink(url);
  });

  debugLog('Deep link handlers initialized');
}

/**
 * Extract deep link URL from command line arguments.
 * Used for handling links that opened the app.
 */
export function getDeepLinkFromArgs(args: string[]): string | null {
  // Look for eclosion:// URLs in the arguments
  for (const arg of args) {
    if (arg.startsWith(`${PROTOCOL}://`) || arg.startsWith(`${PROTOCOL}:`)) {
      return arg;
    }
  }
  return null;
}

/**
 * Check if the app was opened via a deep link and handle it.
 */
export function handleInitialDeepLink(): void {
  const deepLink = getDeepLinkFromArgs(process.argv);
  if (deepLink) {
    debugLog(`Initial deep link: ${deepLink}`);
    void handleDeepLink(deepLink);
  }
}

/**
 * Get the deep link URL format for documentation.
 */
export function getDeepLinkInfo(): { protocol: string; paths: typeof DEEP_LINK_PATHS } {
  return {
    protocol: PROTOCOL,
    paths: DEEP_LINK_PATHS,
  };
}
