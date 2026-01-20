/**
 * Chromium Bookmark Parser
 *
 * Parses Chrome, Edge, and Brave bookmarks from JSON format.
 * All Chromium-based browsers use the same bookmark file structure.
 */

import * as fs from 'node:fs';
import type { Bookmark, ChromiumBookmarkFile, ChromiumBookmarkNode } from '../types';
import { decodeHtmlEntities } from './utils';

/**
 * Chromium stores dates as microseconds since January 1, 1601 (Windows epoch).
 * Convert to ISO string.
 */
export function chromiumDateToISO(chromiumDate: string): string {
  // Chromium epoch: January 1, 1601
  // Unix epoch: January 1, 1970
  // Difference in microseconds: 11644473600000000
  const CHROMIUM_EPOCH_OFFSET = 11644473600000000n;

  try {
    const microseconds = BigInt(chromiumDate);
    const unixMicroseconds = microseconds - CHROMIUM_EPOCH_OFFSET;
    const milliseconds = Number(unixMicroseconds / 1000n);

    // Validate the timestamp is reasonable (after 2000, before 2100)
    const date = new Date(milliseconds);
    const year = date.getFullYear();
    if (year < 2000 || year > 2100) {
      return new Date().toISOString(); // Fallback to current date
    }

    return date.toISOString();
  } catch {
    return new Date().toISOString(); // Fallback to current date
  }
}

/**
 * Convert a Chromium bookmark node to our standardized format.
 */
function convertNode(node: ChromiumBookmarkNode, parentId?: string): Bookmark {
  const bookmark: Bookmark = {
    id: node.guid || node.id,
    name: decodeHtmlEntities(node.name),
    type: node.type,
    parentId,
  };

  if (node.url) {
    bookmark.url = node.url;
  }

  if (node.date_added) {
    bookmark.dateAdded = chromiumDateToISO(node.date_added);
  }

  if (node.children && node.children.length > 0) {
    bookmark.children = node.children.map((child) => convertNode(child, bookmark.id));
  }

  return bookmark;
}

/**
 * Parse a Chromium bookmark file.
 *
 * @param filePath Path to the Bookmarks JSON file
 * @returns Root bookmark node containing all bookmarks, or null on error
 */
export async function parseChromium(filePath: string): Promise<Bookmark | null> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const data: ChromiumBookmarkFile = JSON.parse(content);

    // Validate structure
    if (!data.roots) {
      throw new Error('Invalid bookmark file: missing roots');
    }

    // Create root node containing all bookmark bars
    const root: Bookmark = {
      id: 'root',
      name: 'Bookmarks',
      type: 'folder',
      children: [],
    };

    // Process each root folder
    if (data.roots.bookmark_bar) {
      const bar = convertNode(data.roots.bookmark_bar, 'root');
      bar.name = 'Bookmarks Bar';
      root.children!.push(bar);
    }

    if (data.roots.other) {
      const other = convertNode(data.roots.other, 'root');
      other.name = 'Other Bookmarks';
      root.children!.push(other);
    }

    if (data.roots.synced) {
      const synced = convertNode(data.roots.synced, 'root');
      synced.name = 'Mobile Bookmarks';
      root.children!.push(synced);
    }

    return root;
  } catch (error) {
    // Log error but don't throw - return null to indicate failure
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Bookmarks] Failed to parse Chromium bookmarks: ${message}`);
    return null;
  }
}

/**
 * Count total bookmarks (URLs only, not folders) in a tree.
 */
export function countBookmarks(node: Bookmark): number {
  let count = node.type === 'url' ? 1 : 0;
  if (node.children) {
    for (const child of node.children) {
      count += countBookmarks(child);
    }
  }
  return count;
}

/**
 * Find a folder by ID in the bookmark tree.
 */
export function findFolderById(root: Bookmark, folderId: string): Bookmark | null {
  if (root.id === folderId && root.type === 'folder') {
    return root;
  }

  if (root.children) {
    for (const child of root.children) {
      const found = findFolderById(child, folderId);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Get all bookmarks (URLs) from a folder and its subfolders.
 * Returns a flat array of all nested bookmarks.
 */
export function getAllBookmarksInFolder(folder: Bookmark): Bookmark[] {
  const bookmarks: Bookmark[] = [];

  function traverse(node: Bookmark): void {
    if (node.type === 'url') {
      bookmarks.push(node);
    } else if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(folder);
  return bookmarks;
}
