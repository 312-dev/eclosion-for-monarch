/**
 * Bookmark Internal Types
 *
 * Internal types for bookmark parsing and synchronization.
 * These types represent raw browser-specific data structures.
 */

/** Supported browser types */
export type BrowserType = 'chrome' | 'edge' | 'brave' | 'safari';

/** Permission status for accessing bookmark files */
export type PermissionStatus = 'granted' | 'denied' | 'not_required' | 'unknown';

/**
 * Standardized bookmark item.
 */
export interface Bookmark {
  id: string;
  name: string;
  url?: string;
  dateAdded?: string;
  type: 'url' | 'folder';
  parentId?: string;
  children?: Bookmark[];
}

/** Browser detection result */
export interface DetectedBrowser {
  type: BrowserType;
  displayName: string;
  bookmarkFilePath: string;
  accessible: boolean;
  permissionStatus: PermissionStatus;
  error?: string;
}

/** Folder information for selection UI (flat list) */
export interface BookmarkFolder {
  id: string;
  name: string;
  path: string;
  bookmarkCount: number;
  subfolderCount: number;
}

/** Hierarchical folder tree node for tree selection UI */
export interface FolderTreeNode {
  id: string;
  name: string;
  bookmarkCount: number;
  totalBookmarkCount: number;
  children: FolderTreeNode[];
}

/** Sync configuration */
export interface BookmarkSyncConfig {
  browserType: BrowserType;
  selectedFolderIds: string[];
  enabled: boolean;
  lastSyncAt?: string;
}

/** Change detected during sync */
export interface BookmarkChange {
  changeType: 'added' | 'modified' | 'deleted';
  bookmark: Bookmark;
  previousName?: string;
  previousUrl?: string;
}

/** Sync result */
export interface BookmarkSyncResult {
  success: boolean;
  changes: BookmarkChange[];
  totalBookmarks: number;
  syncedAt: string;
  error?: string;
}

/** Permission request result */
export interface PermissionResult {
  granted: boolean;
  requiresManualGrant: boolean;
  instructions?: string;
}

// ============================================================================
// Raw Browser-Specific Types
// ============================================================================

/** Raw Chromium bookmark node from JSON file */
export interface ChromiumBookmarkNode {
  id: string;
  guid: string;
  name: string;
  type: 'url' | 'folder';
  url?: string;
  date_added?: string;
  date_modified?: string;
  children?: ChromiumBookmarkNode[];
}

/** Raw Chromium bookmark file structure */
export interface ChromiumBookmarkFile {
  checksum: string;
  roots: {
    bookmark_bar: ChromiumBookmarkNode;
    other: ChromiumBookmarkNode;
    synced: ChromiumBookmarkNode;
  };
  version: number;
}

/** Raw Safari bookmark item from plist */
export interface SafariBookmarkItem {
  Title?: string;
  URLString?: string;
  WebBookmarkType?: string;
  WebBookmarkUUID?: string;
  Children?: SafariBookmarkItem[];
  URIDictionary?: {
    title?: string;
  };
}

// ============================================================================
// Browser Configuration
// ============================================================================

/** Configuration for a browser's bookmark file locations */
export interface BrowserConfig {
  type: BrowserType;
  displayName: string;
  paths: {
    darwin?: string[];
    win32?: string[];
    linux?: string[];
  };
}

/** All supported browser configurations */
export const BROWSER_CONFIGS: BrowserConfig[] = [
  {
    type: 'chrome',
    displayName: 'Google Chrome',
    paths: {
      darwin: ['Library/Application Support/Google/Chrome/Default/Bookmarks'],
      win32: ['AppData/Local/Google/Chrome/User Data/Default/Bookmarks'],
      linux: ['.config/google-chrome/Default/Bookmarks', '.config/chromium/Default/Bookmarks'],
    },
  },
  {
    type: 'edge',
    displayName: 'Microsoft Edge',
    paths: {
      darwin: ['Library/Application Support/Microsoft Edge/Default/Bookmarks'],
      win32: ['AppData/Local/Microsoft/Edge/User Data/Default/Bookmarks'],
      linux: ['.config/microsoft-edge/Default/Bookmarks'],
    },
  },
  {
    type: 'brave',
    displayName: 'Brave',
    paths: {
      darwin: ['Library/Application Support/BraveSoftware/Brave-Browser/Default/Bookmarks'],
      win32: ['AppData/Local/BraveSoftware/Brave-Browser/User Data/Default/Bookmarks'],
      linux: ['.config/BraveSoftware/Brave-Browser/Default/Bookmarks'],
    },
  },
  {
    type: 'safari',
    displayName: 'Safari',
    paths: {
      darwin: ['Library/Safari/Bookmarks.plist'],
      // Safari is macOS-only
    },
  },
];
