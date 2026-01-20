/**
 * Bookmark Syncer
 *
 * Handles bookmark synchronization and change detection.
 */

import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import type { Bookmark, BookmarkChange, BookmarkSyncResult, BrowserType } from './types';
import { parseBookmarks } from './parsers';
import { getBookmarkFilePath } from './detector';
import { flattenToMap, countBookmarks, filterToSelectedFolders } from './normalizer';
import {
  getBookmarkHashes,
  setBookmarkHashes,
  updateLastSyncTime,
  getSafariDate,
  setSafariDates,
} from './store';

/**
 * Generate a hash for a bookmark (used for change detection).
 */
function hashBookmark(bookmark: Bookmark): string {
  const content = JSON.stringify({
    name: bookmark.name,
    url: bookmark.url || '',
  });
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Check if the bookmark file was recently modified.
 * Used to avoid reading while the browser is still writing.
 */
async function isFileRecentlyModified(filePath: string, thresholdMs = 500): Promise<boolean> {
  try {
    const stats = await fs.promises.stat(filePath);
    const fileAge = Date.now() - stats.mtimeMs;
    return fileAge < thresholdMs;
  } catch {
    return false;
  }
}

/**
 * Wait for a file to stabilize (not modified recently).
 */
async function waitForFileStability(filePath: string, maxWaitMs = 2000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (!(await isFileRecentlyModified(filePath))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Apply Safari discovery dates to bookmarks.
 * Safari bookmarks don't have dateAdded, so we use first-seen dates.
 */
function applySafariDates(root: Bookmark): void {
  const newIds: string[] = [];

  function traverse(node: Bookmark): void {
    // Check if we have a stored date for this bookmark
    const storedDate = getSafariDate(node.id);
    if (storedDate) {
      node.dateAdded = storedDate;
    } else {
      // New bookmark - will be added to store
      newIds.push(node.id);
      node.dateAdded = new Date().toISOString();
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(root);

  // Store discovery dates for new bookmarks
  if (newIds.length > 0) {
    setSafariDates(newIds);
  }
}

/**
 * Detect changes between previous and current bookmark state.
 */
function detectChanges(
  browserType: BrowserType,
  currentMap: Map<string, Bookmark>
): BookmarkChange[] {
  const changes: BookmarkChange[] = [];
  const previousHashes = getBookmarkHashes(browserType);
  const currentHashes: Record<string, string> = {};

  // Process current bookmarks
  for (const [id, bookmark] of currentMap) {
    // Only track URL bookmarks, not folders
    if (bookmark.type !== 'url') continue;

    const currentHash = hashBookmark(bookmark);
    currentHashes[id] = currentHash;

    const previousHash = previousHashes[id];

    if (!previousHash) {
      // New bookmark
      changes.push({ changeType: 'added', bookmark });
    } else if (previousHash !== currentHash) {
      // Modified bookmark - find what changed
      changes.push({
        changeType: 'modified',
        bookmark,
        // Note: We don't store previous values, so we can't provide previousName/previousUrl
        // Future enhancement: store more metadata for richer change detection
      });
    }
  }

  // Detect deleted bookmarks
  for (const id of Object.keys(previousHashes)) {
    if (!currentHashes[id]) {
      // Bookmark was deleted - we only have the ID, not the full bookmark
      changes.push({
        changeType: 'deleted',
        bookmark: {
          id,
          name: 'Deleted Bookmark',
          type: 'url',
        },
      });
    }
  }

  // Store current hashes for next comparison
  setBookmarkHashes(browserType, currentHashes);

  return changes;
}

/**
 * Perform sync for a specific browser, optionally filtering to specific folders.
 */
export async function syncBrowser(
  browserType: BrowserType,
  folderIds?: string[]
): Promise<BookmarkSyncResult> {
  const filePath = getBookmarkFilePath(browserType);

  if (!filePath) {
    return {
      success: false,
      changes: [],
      totalBookmarks: 0,
      syncedAt: new Date().toISOString(),
      error: 'Bookmark file not found',
    };
  }

  try {
    // Wait for file to stabilize (browser might be writing)
    await waitForFileStability(filePath);

    // Parse current bookmarks
    let currentTree = await parseBookmarks(browserType, filePath);
    if (!currentTree) {
      return {
        success: false,
        changes: [],
        totalBookmarks: 0,
        syncedAt: new Date().toISOString(),
        error: 'Failed to parse bookmarks',
      };
    }

    // Apply Safari discovery dates if needed
    if (browserType === 'safari') {
      applySafariDates(currentTree);
    }

    // Filter to selected folders if specified
    if (folderIds && folderIds.length > 0) {
      const filteredTree = filterToSelectedFolders(currentTree, new Set(folderIds));
      if (!filteredTree) {
        return {
          success: true,
          changes: [],
          totalBookmarks: 0,
          syncedAt: new Date().toISOString(),
        };
      }
      currentTree = filteredTree;
    }

    // Flatten for comparison
    const currentMap = flattenToMap(currentTree);

    // Detect changes
    const changes = detectChanges(browserType, currentMap);

    // Update last sync time
    updateLastSyncTime(browserType);

    const totalBookmarks = countBookmarks(currentTree);

    return {
      success: true,
      changes,
      totalBookmarks,
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      changes: [],
      totalBookmarks: 0,
      syncedAt: new Date().toISOString(),
      error: message,
    };
  }
}

/**
 * Sync all enabled browsers.
 */
export async function syncAllBrowsers(
  enabledBrowsers: BrowserType[]
): Promise<BookmarkSyncResult[]> {
  const results: BookmarkSyncResult[] = [];

  for (const browserType of enabledBrowsers) {
    const result = await syncBrowser(browserType);
    results.push(result);
  }

  return results;
}
