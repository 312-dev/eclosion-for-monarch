/**
 * useBookmarks Hook
 *
 * React hook for interacting with the bookmark sync system.
 * Provides browser detection, folder browsing, and sync operations.
 * Only available in desktop mode.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  DetectedBrowser,
  Bookmark,
  BookmarkFolder,
  FolderTreeNode,
  BookmarkSyncConfig,
  BookmarkSyncResult,
  BookmarkChange,
  PermissionResult,
  BrowserType,
} from '../types/bookmarks';

interface UseBookmarksResult {
  // State
  browsers: DetectedBrowser[];
  isLoading: boolean;
  error: string | null;

  // Browser detection
  detectBrowsers: () => Promise<DetectedBrowser[]>;

  // Folder browsing
  getBookmarkTree: (browserType: BrowserType) => Promise<Bookmark | null>;
  getFolders: (browserType: BrowserType) => Promise<BookmarkFolder[]>;
  getFolderTree: (browserType: BrowserType) => Promise<FolderTreeNode[]>;

  // Permissions
  requestPermission: (browserType: BrowserType) => Promise<PermissionResult>;

  // Configuration
  saveConfig: (config: BookmarkSyncConfig) => Promise<void>;
  getConfigs: () => Promise<BookmarkSyncConfig[]>;

  // Sync
  sync: (browserType: BrowserType, folderIds?: string[]) => Promise<BookmarkSyncResult>;
  syncAll: () => Promise<BookmarkSyncResult[]>;

  // Watcher
  startWatcher: () => Promise<void>;
  stopWatcher: () => Promise<void>;

  // Change listener
  onBookmarkChange: (callback: (change: BookmarkChange) => void) => () => void;
}

/**
 * Hook for managing bookmark synchronization.
 * Returns null functions when not in desktop mode.
 */
export function useBookmarks(): UseBookmarksResult {
  const [browsers, setBrowsers] = useState<DetectedBrowser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDesktop = typeof globalThis.electron?.bookmarks !== 'undefined';

  const detectBrowsers = useCallback(async (): Promise<DetectedBrowser[]> => {
    if (!isDesktop) {
      setError('Bookmark sync is only available in desktop mode');
      return [];
    }

    setIsLoading(true);
    setError(null);
    try {
      const detected = await globalThis.electron!.bookmarks.detectBrowsers();
      setBrowsers(detected as DetectedBrowser[]);
      return detected as DetectedBrowser[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to detect browsers';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isDesktop]);

  const getBookmarkTree = useCallback(
    async (browserType: BrowserType): Promise<Bookmark | null> => {
      if (!isDesktop) return null;
      try {
        const tree = await globalThis.electron!.bookmarks.getBookmarkTree(browserType);
        return tree as Bookmark | null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get bookmark tree';
        setError(message);
        return null;
      }
    },
    [isDesktop]
  );

  const getFolders = useCallback(
    async (browserType: BrowserType): Promise<BookmarkFolder[]> => {
      if (!isDesktop) return [];
      try {
        const folders = await globalThis.electron!.bookmarks.getFolders(browserType);
        return folders as BookmarkFolder[];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get folders';
        setError(message);
        return [];
      }
    },
    [isDesktop]
  );

  const getFolderTree = useCallback(
    async (browserType: BrowserType): Promise<FolderTreeNode[]> => {
      if (!isDesktop) return [];
      try {
        const tree = await globalThis.electron!.bookmarks.getFolderTree(browserType);
        return tree as FolderTreeNode[];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get folder tree';
        setError(message);
        return [];
      }
    },
    [isDesktop]
  );

  const requestPermission = useCallback(
    async (browserType: BrowserType): Promise<PermissionResult> => {
      if (!isDesktop) {
        return { granted: false, requiresManualGrant: false };
      }
      try {
        const result = await globalThis.electron!.bookmarks.requestPermission(browserType);
        return result as PermissionResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to request permission';
        setError(message);
        return { granted: false, requiresManualGrant: false, instructions: message };
      }
    },
    [isDesktop]
  );

  const saveConfig = useCallback(
    async (config: BookmarkSyncConfig): Promise<void> => {
      if (!isDesktop) return;
      try {
        await globalThis.electron!.bookmarks.saveConfig(config);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save config';
        setError(message);
      }
    },
    [isDesktop]
  );

  const getConfigs = useCallback(async (): Promise<BookmarkSyncConfig[]> => {
    if (!isDesktop) return [];
    try {
      const configs = await globalThis.electron!.bookmarks.getConfigs();
      return configs as BookmarkSyncConfig[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get configs';
      setError(message);
      return [];
    }
  }, [isDesktop]);

  const sync = useCallback(
    async (browserType: BrowserType, folderIds?: string[]): Promise<BookmarkSyncResult> => {
      if (!isDesktop) {
        return {
          success: false,
          changes: [],
          totalBookmarks: 0,
          syncedAt: new Date().toISOString(),
          error: 'Not in desktop mode',
        };
      }
      setIsLoading(true);
      try {
        const result = await globalThis.electron!.bookmarks.sync(browserType, folderIds);
        return result as BookmarkSyncResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sync failed';
        setError(message);
        return {
          success: false,
          changes: [],
          totalBookmarks: 0,
          syncedAt: new Date().toISOString(),
          error: message,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [isDesktop]
  );

  const syncAll = useCallback(async (): Promise<BookmarkSyncResult[]> => {
    if (!isDesktop) return [];
    setIsLoading(true);
    try {
      const results = await globalThis.electron!.bookmarks.syncAll();
      return results as BookmarkSyncResult[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync all failed';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isDesktop]);

  const startWatcher = useCallback(async (): Promise<void> => {
    if (!isDesktop) return;
    try {
      await globalThis.electron!.bookmarks.startWatcher();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start watcher';
      setError(message);
    }
  }, [isDesktop]);

  const stopWatcher = useCallback(async (): Promise<void> => {
    if (!isDesktop) return;
    try {
      await globalThis.electron!.bookmarks.stopWatcher();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop watcher';
      setError(message);
    }
  }, [isDesktop]);

  const onBookmarkChange = useCallback(
    (callback: (change: BookmarkChange) => void): (() => void) => {
      if (!isDesktop) return () => {};
      return globalThis.electron!.bookmarks.onBookmarkChange(callback as (change: unknown) => void);
    },
    [isDesktop]
  );

  // Auto-detect browsers on mount
  useEffect(() => {
    if (isDesktop) {
      detectBrowsers();
    }
  }, [isDesktop, detectBrowsers]);

  return {
    browsers,
    isLoading,
    error,
    detectBrowsers,
    getBookmarkTree,
    getFolders,
    getFolderTree,
    requestPermission,
    saveConfig,
    getConfigs,
    sync,
    syncAll,
    startWatcher,
    stopWatcher,
    onBookmarkChange,
  };
}
