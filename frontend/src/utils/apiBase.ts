/**
 * API Base URL Utility
 *
 * Handles dynamic API base URL for both web and desktop (Electron) modes.
 * In web mode, uses relative URLs (same origin).
 * In desktop mode, uses the backend port from Electron IPC.
 */

// Cache the port once retrieved to avoid repeated IPC calls
let cachedPort: number | null = null;
let portPromise: Promise<number> | null = null;

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

  // If a request is already in flight, wait for it
  if (portPromise) {
    const port = await portPromise;
    return `http://127.0.0.1:${port}`;
  }

  // Request the port from Electron main process
  portPromise = window.electron!.getBackendPort();

  try {
    cachedPort = await portPromise;
    return `http://127.0.0.1:${cachedPort}`;
  } finally {
    portPromise = null;
  }
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
 * Initialize the API base URL (call during app startup in Electron mode).
 * This pre-fetches the port so subsequent calls to getApiBaseSync work.
 */
export async function initializeApiBase(): Promise<void> {
  if (isDesktopMode() && cachedPort === null) {
    await getApiBase();
  }
}

/**
 * Clear the cached port (useful for testing or if backend restarts).
 */
export function clearApiBaseCache(): void {
  cachedPort = null;
  portPromise = null;
}
