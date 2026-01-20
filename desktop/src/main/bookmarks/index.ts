/**
 * Bookmarks Module
 *
 * Cross-browser bookmark synchronization for Eclosion.
 * Supports Chrome, Edge, Brave, and Safari.
 */

import { ipcMain } from 'electron';
import { getMainWindow } from '../window';
import { detectBrowsers, getBookmarkFilePath } from './detector';
import { parseBookmarks } from './parsers';
import { extractFolders, getFolderTree } from './normalizer';
import { requestPermission } from './permissions';
import { syncBrowser } from './syncer';
import { startWatcher, stopWatcher, setChangeCallback } from './watcher';
import { getConfigs, saveConfig, getConfig } from './store';
import type { BrowserType, BookmarkSyncConfig, BookmarkChange } from './types';

// Re-export types for consumers
export type { BrowserType, Bookmark, DetectedBrowser, BookmarkFolder, FolderTreeNode } from './types';
export type { BookmarkSyncConfig, BookmarkChange, BookmarkSyncResult, PermissionResult } from './types';

/**
 * Send bookmark change to renderer.
 */
function sendChangeToRenderer(browserType: BrowserType, changes: BookmarkChange[]): void {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    for (const change of changes) {
      mainWindow.webContents.send('bookmark-change', {
        browserType,
        ...change,
      });
    }
  }
}

/**
 * Setup all bookmark-related IPC handlers.
 * Call this from the main process initialization.
 */
export function setupBookmarkIpcHandlers(): void {
  // =========================================================================
  // Browser Detection
  // =========================================================================

  /**
   * Detect installed browsers with accessible bookmark files.
   */
  ipcMain.handle('bookmarks:detect-browsers', async () => {
    return detectBrowsers();
  });

  // =========================================================================
  // Bookmark Tree & Folders
  // =========================================================================

  /**
   * Get the full bookmark tree for a browser.
   */
  ipcMain.handle('bookmarks:get-tree', async (_event, browserType: BrowserType) => {
    const filePath = getBookmarkFilePath(browserType);
    if (!filePath) return null;
    return parseBookmarks(browserType, filePath);
  });

  /**
   * Get flat list of folders for selection UI.
   */
  ipcMain.handle('bookmarks:get-folders', async (_event, browserType: BrowserType) => {
    const filePath = getBookmarkFilePath(browserType);
    if (!filePath) return [];

    const tree = await parseBookmarks(browserType, filePath);
    if (!tree) return [];

    return extractFolders(tree);
  });

  /**
   * Get hierarchical folder tree for selection UI.
   */
  ipcMain.handle('bookmarks:get-folder-tree', async (_event, browserType: BrowserType) => {
    const filePath = getBookmarkFilePath(browserType);
    if (!filePath) return [];

    const tree = await parseBookmarks(browserType, filePath);
    if (!tree) return [];

    return getFolderTree(tree);
  });

  // =========================================================================
  // Permissions
  // =========================================================================

  /**
   * Request permission for a browser (mainly for Safari on macOS).
   */
  ipcMain.handle('bookmarks:request-permission', async (_event, browserType: BrowserType) => {
    return requestPermission(browserType);
  });

  // =========================================================================
  // Configuration
  // =========================================================================

  /**
   * Save sync configuration for a browser.
   */
  ipcMain.handle('bookmarks:save-config', async (_event, config: BookmarkSyncConfig) => {
    saveConfig(config);
  });

  /**
   * Get all sync configurations.
   */
  ipcMain.handle('bookmarks:get-configs', async () => {
    return getConfigs();
  });

  /**
   * Get configuration for a specific browser.
   */
  ipcMain.handle('bookmarks:get-config', async (_event, browserType: BrowserType) => {
    return getConfig(browserType);
  });

  // =========================================================================
  // Sync Operations
  // =========================================================================

  /**
   * Perform sync for a specific browser, optionally filtering to specific folders.
   */
  ipcMain.handle(
    'bookmarks:sync',
    async (_event, browserType: BrowserType, folderIds?: string[]) => {
      return syncBrowser(browserType, folderIds);
    }
  );

  /**
   * Perform sync for all enabled browsers.
   */
  ipcMain.handle('bookmarks:sync-all', async () => {
    const configs = getConfigs();
    const enabledBrowsers = configs.filter((c) => c.enabled).map((c) => c.browserType);

    const results = [];
    for (const browserType of enabledBrowsers) {
      const result = await syncBrowser(browserType);
      results.push({ browserType, ...result });
    }

    return results;
  });

  // =========================================================================
  // File Watching
  // =========================================================================

  /**
   * Start watching bookmark files for changes.
   */
  ipcMain.handle('bookmarks:start-watcher', async () => {
    setChangeCallback(sendChangeToRenderer);
    await startWatcher();
  });

  /**
   * Stop watching bookmark files.
   */
  ipcMain.handle('bookmarks:stop-watcher', async () => {
    await stopWatcher();
  });
}

/**
 * Initialize bookmark sync on app startup.
 * Call this after the main window is created.
 */
export async function initializeBookmarkSync(): Promise<void> {
  // Set up the change callback for file watching
  setChangeCallback(sendChangeToRenderer);

  // Optionally start the watcher automatically
  // (disabled by default - let the user control this)
  // await startWatcher();
}

/**
 * Cleanup bookmark sync on app shutdown.
 */
export async function cleanupBookmarkSync(): Promise<void> {
  await stopWatcher();
}
