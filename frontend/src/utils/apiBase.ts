/**
 * API Base URL Utility
 *
 * Handles dynamic API base URL for both web and desktop (Electron) modes.
 * In web mode, uses relative URLs (same origin).
 * In desktop mode, uses the backend port from Electron IPC.
 *
 * Security: In desktop mode, a runtime secret is required for all API requests.
 * This prevents other local processes (browser tabs, malicious apps) from
 * accessing the API.
 */

// Cache the port and secret once retrieved to avoid repeated IPC calls
let cachedPort: number | null = null;
let cachedSecret: string | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Check if running in Electron desktop mode.
 */
export function isDesktopMode(): boolean {
  return typeof window !== 'undefined' && window.electron !== undefined;
}

/**
 * Get the API base URL asynchronously.
 * For Electron: returns `http://127.0.0.1:{port}`
 * For web: returns empty string (relative URLs)
 */
export async function getApiBase(): Promise<string> {
  // If not in Electron, use relative URLs
  if (!isDesktopMode()) {
    return '';
  }

  // If we already have the port cached, return immediately
  if (cachedPort !== null) {
    return `http://127.0.0.1:${cachedPort}`;
  }

  // Ensure initialization is complete
  await initializeApiBase();
  return `http://127.0.0.1:${cachedPort}`;
}

/**
 * Get the API base URL synchronously.
 * Returns empty string if port is not yet cached.
 * Use getApiBase() for the async version that ensures the port is available.
 */
export function getApiBaseSync(): string {
  if (!isDesktopMode()) {
    return '';
  }

  if (cachedPort !== null) {
    return `http://127.0.0.1:${cachedPort}`;
  }

  // Port not yet cached, return empty string
  // The async version should be used during app initialization
  return '';
}

/**
 * Get the desktop secret for API authentication.
 * Returns null in web mode or if not yet initialized.
 */
export function getDesktopSecret(): string | null {
  if (!isDesktopMode()) {
    return null;
  }
  return cachedSecret;
}

/**
 * Initialize the API base URL and desktop secret (call during app startup in Electron mode).
 * This pre-fetches the port and secret so subsequent sync calls work.
 */
export async function initializeApiBase(): Promise<void> {
  if (!isDesktopMode()) {
    return;
  }

  // If already initialized, return immediately
  if (cachedPort !== null && cachedSecret !== null) {
    return;
  }

  // If initialization is in progress, wait for it
  if (initPromise) {
    await initPromise;
    return;
  }

  // Start initialization
  initPromise = (async () => {
    const [port, secret] = await Promise.all([
      window.electron!.getBackendPort(),
      window.electron!.getDesktopSecret(),
    ]);
    cachedPort = port;
    cachedSecret = secret;
  })();

  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}

/**
 * Clear the cached port and secret (useful for testing or if backend restarts).
 */
export function clearApiBaseCache(): void {
  cachedPort = null;
  cachedSecret = null;
  initPromise = null;
}
