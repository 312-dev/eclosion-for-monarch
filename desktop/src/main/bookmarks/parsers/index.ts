/**
 * Parser Dispatcher
 *
 * Routes bookmark parsing to browser-specific implementations.
 */

import type { Bookmark, BrowserType } from '../types';
import { parseChromium } from './chromium';
import { parseSafari } from './safari';

/**
 * Parse bookmarks from a browser's bookmark file.
 *
 * @param browserType Type of browser
 * @param filePath Path to the bookmark file
 * @returns Root bookmark node, or null on error
 */
export async function parseBookmarks(
  browserType: BrowserType,
  filePath: string
): Promise<Bookmark | null> {
  switch (browserType) {
    case 'chrome':
    case 'edge':
    case 'brave':
      return parseChromium(filePath);
    case 'safari':
      return parseSafari(filePath);
    default:
      return null;
  }
}

// Re-export utilities
export { chromiumDateToISO, countBookmarks, findFolderById, getAllBookmarksInFolder } from './chromium';
