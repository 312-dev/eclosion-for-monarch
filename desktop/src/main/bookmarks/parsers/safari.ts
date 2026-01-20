/**
 * Safari Bookmark Parser
 *
 * Parses Safari bookmarks from binary plist format.
 * Requires bplist-parser npm package.
 */

import * as fs from 'node:fs';
import type { Bookmark, SafariBookmarkItem } from '../types';
import { decodeHtmlEntities } from './utils';

// bplist-parser types (the package returns an array synchronously)
interface BplistParserModule {
  parseBuffer: (buffer: Buffer) => unknown[];
}

// Dynamic import to handle missing dependency gracefully
let bplistParser: BplistParserModule | null = null;

async function getBplistParser(): Promise<BplistParserModule | null> {
  if (bplistParser) return bplistParser;

  try {
    // Use dynamic import for the binary plist parser
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const module = (await import('bplist-parser')) as any;
    bplistParser = (module.default || module) as BplistParserModule;
    return bplistParser;
  } catch {
    console.error('[Bookmarks] bplist-parser not available. Safari bookmark sync disabled.');
    return null;
  }
}

/**
 * Convert a Safari bookmark item to our standardized format.
 */
function convertNode(node: SafariBookmarkItem, parentId?: string): Bookmark | null {
  // Skip the Reading List proxy (we don't sync that)
  if (node.WebBookmarkType === 'WebBookmarkTypeProxy') {
    return null;
  }

  // Determine type
  // WebBookmarkTypeList is used for top-level containers like Favorites (BookmarksBar) and BookmarksMenu
  // WebBookmarkTypeFolder is used for user-created folders
  // WebBookmarkTypeLeaf is used for individual bookmarks (URLs)
  const isFolder =
    node.WebBookmarkType === 'WebBookmarkTypeFolder' ||
    node.WebBookmarkType === 'WebBookmarkTypeList' ||
    (node.Children !== undefined && node.Children.length > 0);

  // Generate a stable ID (Safari uses UUID)
  const id = node.WebBookmarkUUID || `safari-${Math.random().toString(36).substring(2, 11)}`;

  // Get title, preferring URIDictionary.title for bookmarks
  const rawName = node.URIDictionary?.title || node.Title || 'Untitled';
  const name = decodeHtmlEntities(rawName);

  const bookmark: Bookmark = {
    id,
    name,
    type: isFolder ? 'folder' : 'url',
    parentId,
    // Safari doesn't store dateAdded - this will be filled in by the syncer
    // using the first-seen date from our persistent store
  };

  if (node.URLString) {
    bookmark.url = node.URLString;
  }

  // Process children for folders
  if (node.Children && node.Children.length > 0) {
    bookmark.children = node.Children.map((child) => convertNode(child, id)).filter(
      (b): b is Bookmark => b !== null
    );
  }

  return bookmark;
}

/**
 * Parse a Safari Bookmarks.plist file.
 *
 * @param filePath Path to the Bookmarks.plist file
 * @returns Root bookmark node containing all bookmarks, or null on error
 */
export async function parseSafari(filePath: string): Promise<Bookmark | null> {
  const parser = await getBplistParser();
  if (!parser) {
    return null;
  }

  try {
    const buffer = await fs.promises.readFile(filePath);
    const parsed = parser.parseBuffer(buffer);

    if (!parsed || parsed.length === 0) {
      throw new Error('Empty or invalid plist file');
    }

    const data = parsed[0] as SafariBookmarkItem;

    // The root element may contain Children directly or be a wrapper
    let children: SafariBookmarkItem[];
    if (data.Children) {
      children = data.Children;
    } else if (Array.isArray(data)) {
      children = data;
    } else {
      throw new Error('Unexpected plist structure');
    }

    // Create root node
    const root: Bookmark = {
      id: 'root',
      name: 'Bookmarks',
      type: 'folder',
      children: [],
    };

    // Convert all top-level children
    for (const child of children) {
      const converted = convertNode(child, 'root');
      if (converted) {
        // Rename known folders
        if (converted.name === 'BookmarksBar') {
          converted.name = 'Favorites';
        } else if (converted.name === 'BookmarksMenu') {
          converted.name = 'Bookmarks Menu';
        }
        root.children!.push(converted);
      }
    }

    return root;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Bookmarks] Failed to parse Safari bookmarks: ${message}`);
    return null;
  }
}
