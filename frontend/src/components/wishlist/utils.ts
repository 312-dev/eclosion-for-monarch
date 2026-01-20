/**
 * Wishlist Utility Functions
 *
 * Helper functions for wishlist bookmark processing.
 */

import type { Bookmark, ImportBookmark, BrowserType } from '../../types';

/** Get short browser display name */
export function getBrowserName(type: BrowserType | null): string {
  switch (type) {
    case 'chrome':
      return 'Chrome';
    case 'edge':
      return 'Edge';
    case 'safari':
      return 'Safari';
    case 'brave':
      return 'Brave';
    default:
      return 'Browser Bookmarks';
  }
}

/**
 * Decode HTML entities in a string.
 */
export function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/**
 * Recursively collect all URL bookmarks from a folder subtree.
 */
export function collectBookmarksFromFolder(
  node: Bookmark,
  targetFolderIds: string[],
  browserType: string
): ImportBookmark[] {
  const bookmarks: ImportBookmark[] = [];
  const targetSet = new Set(targetFolderIds);

  function findAndCollect(current: Bookmark, isInTarget: boolean): void {
    const nowInTarget = isInTarget || targetSet.has(current.id);

    if (nowInTarget && current.type === 'url' && current.url) {
      bookmarks.push({
        url: current.url,
        name: decodeHtmlEntities(current.name),
        bookmark_id: current.id,
        browser_type: browserType as ImportBookmark['browser_type'],
      });
    }

    if (current.children) {
      for (const child of current.children) {
        findAndCollect(child, nowInTarget);
      }
    }
  }

  findAndCollect(node, false);
  return bookmarks;
}
