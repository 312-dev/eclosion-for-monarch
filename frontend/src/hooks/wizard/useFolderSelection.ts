/**
 * useFolderSelection - Hook for bookmark folder selection in wishlist wizard
 *
 * Manages folder tree loading, expansion state, and single-folder selection.
 * Selecting a folder automatically includes all its subfolders.
 */

import { useState, useCallback, useMemo } from 'react';
import { useBookmarks } from '../useBookmarks';
import type { BrowserType, FolderTreeNode } from '../../types/bookmarks';

export interface UseFolderSelectionResult {
  /** Full folder tree for the selected browser */
  folderTree: FolderTreeNode[];
  /** Set of expanded folder IDs for tree UI */
  expandedIds: Set<string>;
  /** Currently selected folder ID (null if none) */
  selectedFolderId: string | null;
  /** Currently selected folder name (null if none) */
  selectedFolderName: string | null;
  /** Whether folder tree is loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Whether folders have been fetched */
  foldersFetched: boolean;
  /** Total bookmark count in selected folder (including subfolders) */
  totalSelectedBookmarks: number;

  /** Load folder tree for a browser */
  loadFolders: (browserType: BrowserType) => Promise<void>;
  /** Toggle folder expansion in tree UI */
  toggleExpanded: (folderId: string) => void;
  /** Select a folder (deselects if already selected) */
  selectFolder: (folderId: string) => void;
  /** Clear all state */
  reset: () => void;
}

export function useFolderSelection(): UseFolderSelectionResult {
  const { getFolderTree } = useBookmarks();

  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foldersFetched, setFoldersFetched] = useState(false);

  // Find a folder by ID in the tree
  const findFolder = useCallback(
    (folderId: string, nodes: FolderTreeNode[] = folderTree): FolderTreeNode | null => {
      for (const node of nodes) {
        if (node.id === folderId) {
          return node;
        }
        if (node.children.length > 0) {
          const found = findFolder(folderId, node.children);
          if (found) return found;
        }
      }
      return null;
    },
    [folderTree]
  );

  // Calculate total bookmarks in selected folder (including all subfolders)
  const totalSelectedBookmarks = useMemo(() => {
    if (!selectedFolderId) return 0;
    const folder = findFolder(selectedFolderId);
    // totalBookmarkCount already includes all descendants
    return folder?.totalBookmarkCount ?? 0;
  }, [selectedFolderId, findFolder]);

  // Get the selected folder name
  const selectedFolderName = useMemo(() => {
    if (!selectedFolderId) return null;
    const folder = findFolder(selectedFolderId);
    return folder?.name ?? null;
  }, [selectedFolderId, findFolder]);

  const loadFolders = useCallback(
    async (browserType: BrowserType) => {
      setIsLoading(true);
      setError(null);
      setFoldersFetched(false);

      try {
        const tree = await getFolderTree(browserType);
        setFolderTree(tree);
        setFoldersFetched(true);

        // Auto-expand first level
        const firstLevelIds = new Set(tree.map((node) => node.id));
        setExpandedIds(firstLevelIds);

        // Clear selection when loading new browser's folders
        setSelectedFolderId(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load folders';
        setError(message);
        setFolderTree([]);
      } finally {
        setIsLoading(false);
      }
    },
    [getFolderTree]
  );

  const toggleExpanded = useCallback((folderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const selectFolder = useCallback((folderId: string) => {
    setSelectedFolderId((prev) => (prev === folderId ? null : folderId));
  }, []);

  const reset = useCallback(() => {
    setFolderTree([]);
    setExpandedIds(new Set());
    setSelectedFolderId(null);
    setIsLoading(false);
    setError(null);
    setFoldersFetched(false);
  }, []);

  return {
    folderTree,
    expandedIds,
    selectedFolderId,
    selectedFolderName,
    isLoading,
    error,
    foldersFetched,
    totalSelectedBookmarks,
    loadFolders,
    toggleExpanded,
    selectFolder,
    reset,
  };
}
