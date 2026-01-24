/**
 * Stash Bookmark Sync Hook
 *
 * Handles browser bookmark synchronization for the stash feature.
 */

import { useState, useCallback } from 'react';
import { useBookmarks } from './useBookmarks';
import { useImportBookmarksMutation } from '../api/queries';
import { useToast } from '../context/ToastContext';
import { handleApiError } from '../utils';
import { collectBookmarksFromFolder } from '../components/stash';
import type { BrowserType } from '../types';

interface UseStashSyncOptions {
  selectedBrowser: BrowserType | null;
  selectedFolderIds: string[] | null;
  isBrowserConfigured: boolean;
  onShowSetupWizard: () => void;
}

export function useStashSync({
  selectedBrowser,
  selectedFolderIds,
  isBrowserConfigured,
  onShowSetupWizard,
}: UseStashSyncOptions) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { getBookmarkTree } = useBookmarks();
  const importMutation = useImportBookmarksMutation();
  const toast = useToast();

  /**
   * Sync bookmarks from configured browser folder.
   * @param options.silent - If true, suppresses toasts except for errors and new imports
   */
  const syncBookmarks = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (!isBrowserConfigured) {
        onShowSetupWizard();
        return;
      }

      if (!selectedBrowser || !selectedFolderIds?.length) return;

      setIsSyncing(true);
      try {
        const tree = await getBookmarkTree(selectedBrowser);
        if (!tree) {
          if (!silent) toast.error('Failed to read bookmarks');
          return;
        }

        const bookmarks = collectBookmarksFromFolder(tree, selectedFolderIds, selectedBrowser);
        if (bookmarks.length === 0) {
          if (!silent) toast.success('No bookmarks found in folder');
          return;
        }

        const result = await importMutation.mutateAsync(bookmarks);
        if (result.imported > 0) {
          // Always show when new bookmarks are imported
          toast.success(
            `Imported ${result.imported} new bookmark${result.imported === 1 ? '' : 's'}`
          );
        } else if (!silent) {
          toast.success('All bookmarks already imported');
        }
      } catch (err) {
        if (!silent) toast.error(handleApiError(err, 'Syncing bookmarks'));
      } finally {
        setIsSyncing(false);
      }
    },
    [
      isBrowserConfigured,
      selectedBrowser,
      selectedFolderIds,
      getBookmarkTree,
      importMutation,
      toast,
      onShowSetupWizard,
    ]
  );

  return { isSyncing, syncBookmarks };
}
