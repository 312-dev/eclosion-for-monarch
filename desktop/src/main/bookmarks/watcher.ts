/**
 * Bookmark Watcher
 *
 * Watches bookmark files for changes using chokidar.
 * Provides real-time sync capabilities.
 */

import type { FSWatcher } from 'chokidar';
import { detectBrowsers } from './detector';
import { syncBrowser } from './syncer';
import type { BrowserType, BookmarkChange } from './types';
import { BROWSER_CONFIGS } from './types';

// Watcher instance
let watcher: FSWatcher | null = null;

// Debounce timers for each browser
const debounceTimers = new Map<BrowserType, NodeJS.Timeout>();

// Debounce delay in milliseconds
const DEBOUNCE_MS = 1000;

// Callback for bookmark changes
type ChangeCallback = (browserType: BrowserType, changes: BookmarkChange[]) => void;
let changeCallback: ChangeCallback | null = null;

/**
 * Get browser type from a file path.
 * Normalizes path separators for cross-platform comparison.
 */
function getBrowserTypeFromPath(filePath: string): BrowserType | null {
  // Normalize path separators to forward slashes for comparison
  const normalizedPath = filePath.replaceAll('\\', '/');

  for (const config of BROWSER_CONFIGS) {
    for (const platform of ['darwin', 'win32', 'linux'] as const) {
      const paths = config.paths[platform];
      if (paths?.some((p) => normalizedPath.includes(p))) {
        return config.type;
      }
    }
  }
  return null;
}

/**
 * Handle a file change with debouncing.
 */
async function handleFileChange(filePath: string): Promise<void> {
  const browserType = getBrowserTypeFromPath(filePath);
  if (!browserType) return;

  // Cancel existing timer for this browser
  const existingTimer = debounceTimers.get(browserType);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new debounced timer
  debounceTimers.set(
    browserType,
    setTimeout(async () => {
      debounceTimers.delete(browserType);

      try {
        const result = await syncBrowser(browserType);

        if (result.success && result.changes.length > 0 && changeCallback) {
          changeCallback(browserType, result.changes);
        }
      } catch (error) {
        console.error(`[BookmarkWatcher] Sync error for ${browserType}:`, error);
      }
    }, DEBOUNCE_MS)
  );
}

/**
 * Start watching bookmark files for all accessible browsers.
 */
export async function startWatcher(callback?: ChangeCallback): Promise<void> {
  if (watcher) {
    console.log('[BookmarkWatcher] Already running');
    return;
  }

  if (callback) {
    changeCallback = callback;
  }

  // Dynamically import chokidar
  let chokidar;
  try {
    chokidar = await import('chokidar');
  } catch {
    console.error('[BookmarkWatcher] chokidar not available');
    return;
  }

  // Get accessible browser bookmark files
  const browsers = await detectBrowsers();
  const watchPaths = browsers.filter((b) => b.accessible).map((b) => b.bookmarkFilePath);

  if (watchPaths.length === 0) {
    console.log('[BookmarkWatcher] No accessible bookmark files to watch');
    return;
  }

  console.log(`[BookmarkWatcher] Starting watch on ${watchPaths.length} files`);

  watcher = chokidar.watch(watchPaths, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });

  watcher.on('change', (path: string) => {
    console.log(`[BookmarkWatcher] Change detected: ${path}`);
    handleFileChange(path);
  });

  watcher.on('error', (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[BookmarkWatcher] Error: ${message}`);
  });
}

/**
 * Stop watching bookmark files.
 */
export async function stopWatcher(): Promise<void> {
  if (watcher) {
    await watcher.close();
    watcher = null;

    // Clear all pending timers
    for (const timer of debounceTimers.values()) {
      clearTimeout(timer);
    }
    debounceTimers.clear();

    changeCallback = null;

    console.log('[BookmarkWatcher] Stopped');
  }
}

/**
 * Check if the watcher is currently running.
 */
export function isWatcherRunning(): boolean {
  return watcher !== null;
}

/**
 * Set the change callback.
 */
export function setChangeCallback(callback: ChangeCallback | null): void {
  changeCallback = callback;
}
