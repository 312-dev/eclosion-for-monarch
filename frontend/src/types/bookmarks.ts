/**
 * Bookmark Types
 *
 * Types for cross-browser bookmark synchronization.
 * Supports Chrome, Edge, Brave, and Safari browsers.
 */

/** Supported browser types */
export type BrowserType = 'chrome' | 'edge' | 'brave' | 'safari';

/** Permission status for accessing bookmark files */
export type PermissionStatus = 'granted' | 'denied' | 'not_required' | 'unknown';

/**
 * Standardized bookmark item.
 * Represents either a bookmark (URL) or a folder containing bookmarks.
 */
export interface Bookmark {
  /** Unique identifier (guid for Chromium, UUID for Safari) */
  id: string;
  /** Display name of the bookmark or folder */
  name: string;
  /** URL (undefined for folders) */
  url?: string;
  /** Date added as ISO string (Chromium: from file; Safari: first discovery date) */
  dateAdded?: string;
  /** Type discriminator */
  type: 'url' | 'folder';
  /** Parent folder ID (undefined for root) */
  parentId?: string;
  /** Children (only present for folders) */
  children?: Bookmark[];
}

/** Browser detection result */
export interface DetectedBrowser {
  /** Browser type */
  type: BrowserType;
  /** Display name (e.g., "Google Chrome", "Microsoft Edge") */
  displayName: string;
  /** Path to the bookmark file */
  bookmarkFilePath: string;
  /** Whether the file exists and is readable */
  accessible: boolean;
  /** Permission status (mainly relevant for Safari on macOS) */
  permissionStatus: PermissionStatus;
  /** Human-readable error message if not accessible */
  error?: string;
}

/** Folder information for selection UI (flat list) */
export interface BookmarkFolder {
  /** Folder ID */
  id: string;
  /** Folder name */
  name: string;
  /** Full path from root (e.g., "Bookmarks Bar > Work > Projects") */
  path: string;
  /** Number of bookmarks in this folder (non-recursive) */
  bookmarkCount: number;
  /** Number of subfolders */
  subfolderCount: number;
}

/** Hierarchical folder tree node for tree selection UI */
export interface FolderTreeNode {
  /** Folder ID */
  id: string;
  /** Folder name */
  name: string;
  /** Number of bookmarks directly in this folder */
  bookmarkCount: number;
  /** Total bookmarks including all descendants */
  totalBookmarkCount: number;
  /** Child folders */
  children: FolderTreeNode[];
}

/** Sync configuration for a specific browser */
export interface BookmarkSyncConfig {
  /** Browser type */
  browserType: BrowserType;
  /** Selected folder IDs to sync */
  selectedFolderIds: string[];
  /** Whether sync is enabled for this browser */
  enabled: boolean;
  /** Last successful sync timestamp (ISO string) */
  lastSyncAt?: string;
}

/** Change detected during sync */
export interface BookmarkChange {
  /** Type of change */
  changeType: 'added' | 'modified' | 'deleted';
  /** The bookmark (for added/modified) or previous state (for deleted) */
  bookmark: Bookmark;
  /** Previous name (for renames) */
  previousName?: string;
  /** Previous URL (for URL changes) */
  previousUrl?: string;
}

/** Sync operation result */
export interface BookmarkSyncResult {
  /** Whether sync succeeded */
  success: boolean;
  /** Detected changes */
  changes: BookmarkChange[];
  /** Total bookmarks processed */
  totalBookmarks: number;
  /** Sync timestamp (ISO string) */
  syncedAt: string;
  /** Error message if failed */
  error?: string;
}

/** Permission request result */
export interface PermissionResult {
  /** Whether permission was granted */
  granted: boolean;
  /** Whether the user needs to grant permission manually (e.g., Full Disk Access) */
  requiresManualGrant: boolean;
  /** Instructions for manual permission grant */
  instructions?: string;
}
