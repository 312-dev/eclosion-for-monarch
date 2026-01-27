/**
 * Page Sync Manager
 *
 * Provides page-aware sync functionality that only refreshes
 * data relevant to the current page for complete accuracy.
 */

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../context/DemoContext';
import { useIsRateLimited } from '../context/RateLimitContext';
import { queryKeys, getQueryKey } from '../api/queries/keys';
import {
  type PageName,
  type QueryKeyName,
  getPagePrimaryQueries,
  getPageAllQueries,
  getPageSyncScope,
} from '../api/queries/dependencies';
import * as api from '../api/client';
import * as demoApi from '../api/demoClient';

export type SyncScope = 'recurring' | 'stash' | 'notes' | 'full';

interface PageSyncResult {
  /** Trigger a sync for the current page */
  sync: () => Promise<void>;
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** The sync scope for this page */
  syncScope: SyncScope;
  /** Error from the last sync attempt, if any */
  error: Error | null;
}

/**
 * Hook for page-specific sync operations.
 *
 * Syncs only the data needed for accurate display on the current page,
 * reducing API calls and improving perceived performance.
 *
 * @param page - The current page name
 * @returns Sync function, loading state, and error
 *
 * @example
 * ```tsx
 * function RecurringTab() {
 *   const { sync, isSyncing, error } = usePageSync('recurring');
 *
 *   return (
 *     <button onClick={sync} disabled={isSyncing}>
 *       {isSyncing ? 'Syncing...' : 'Sync'}
 *     </button>
 *   );
 * }
 * ```
 */
export function usePageSync(page: PageName): PageSyncResult {
  const queryClient = useQueryClient();
  const isDemo = useDemo();
  const isRateLimited = useIsRateLimited();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const syncScope = getPageSyncScope(page);

  const sync = useCallback(async () => {
    // Don't sync if rate limited
    if (isRateLimited) {
      setError(new Error('Rate limited - please wait before syncing'));
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      // Call backend sync with scope parameter
      if (isDemo) {
        // Demo mode: just invalidate queries (no backend)
        await demoApi.triggerSync();
      } else {
        // Production mode: call scoped sync endpoint
        await api.triggerScopedSync(syncScope);
      }

      // Invalidate primary queries (must be fresh for accuracy)
      const primaryQueries = getPagePrimaryQueries(page);
      await Promise.all(
        primaryQueries.map((key) => {
          const queryKeyArray = queryKeys[key as keyof typeof queryKeys];
          if (queryKeyArray) {
            return queryClient.invalidateQueries({
              queryKey: getQueryKey(queryKeyArray, isDemo),
            });
          }
          return Promise.resolve();
        })
      );

      // Mark supporting queries as stale (lazy refetch)
      const allQueries = getPageAllQueries(page);
      const supportingQueries = allQueries.filter(
        (q) => !primaryQueries.includes(q)
      ) as QueryKeyName[];

      supportingQueries.forEach((key) => {
        const queryKeyArray = queryKeys[key as keyof typeof queryKeys];
        if (queryKeyArray) {
          queryClient.invalidateQueries({
            queryKey: getQueryKey(queryKeyArray, isDemo),
            refetchType: 'none', // Mark stale without immediate refetch
          });
        }
      });

      // Notify Electron about sync completion (for tray menu)
      if (!isDemo && globalThis.electron?.pendingSync?.notifyCompleted) {
        const now = new Date().toISOString();
        globalThis.electron.pendingSync.notifyCompleted(now).catch(() => {
          // Ignore errors - this is just for tray menu updates
        });
      }
    } catch (err) {
      const syncError = err instanceof Error ? err : new Error('Sync failed');
      setError(syncError);
      throw syncError;
    } finally {
      setIsSyncing(false);
    }
  }, [page, syncScope, isDemo, isRateLimited, queryClient]);

  return {
    sync,
    isSyncing,
    syncScope,
    error,
  };
}

/**
 * Hook for triggering a full sync across all pages.
 * Use this when the user explicitly requests a complete refresh.
 *
 * @example
 * ```tsx
 * function SyncButton() {
 *   const { fullSync, isSyncing } = useFullSync();
 *
 *   return (
 *     <button onClick={fullSync} disabled={isSyncing}>
 *       Full Sync
 *     </button>
 *   );
 * }
 * ```
 */
export function useFullSync() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();
  const isRateLimited = useIsRateLimited();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fullSync = useCallback(async () => {
    if (isRateLimited) {
      setError(new Error('Rate limited - please wait before syncing'));
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      // Call full sync endpoint
      if (isDemo) {
        await demoApi.triggerSync();
      } else {
        await api.triggerScopedSync('full');
      }

      // Invalidate all Monarch-dependent queries
      const queriesToInvalidate: (keyof typeof queryKeys)[] = [
        'dashboard',
        'categoryStore',
        'stash',
        'availableToStash',
        'monarchGoals',
        'categoryGroups',
        'stashHistory',
      ];

      await Promise.all(
        queriesToInvalidate.map((key) =>
          queryClient.invalidateQueries({
            queryKey: getQueryKey(queryKeys[key], isDemo),
          })
        )
      );

      // Notify Electron about sync completion
      if (!isDemo && globalThis.electron?.pendingSync?.notifyCompleted) {
        const now = new Date().toISOString();
        globalThis.electron.pendingSync.notifyCompleted(now).catch(() => {});
      }
    } catch (err) {
      const syncError = err instanceof Error ? err : new Error('Sync failed');
      setError(syncError);
      throw syncError;
    } finally {
      setIsSyncing(false);
    }
  }, [isDemo, isRateLimited, queryClient]);

  return {
    fullSync,
    isSyncing,
    error,
  };
}

/**
 * Hook to get the current page from the URL.
 * Useful for components that need to know the current page context.
 */
export function useCurrentPage(): PageName {
  // Get pathname from window.location
  const pathname = typeof globalThis.window === 'undefined' ? '' : globalThis.location.pathname;

  // Map pathname to page name
  if (pathname.includes('/stashes') || pathname.includes('/demo/stashes')) {
    return 'stash';
  }
  if (pathname.includes('/notes') || pathname.includes('/demo/notes')) {
    return 'notes';
  }
  if (pathname.includes('/settings') || pathname.includes('/demo/settings')) {
    return 'settings';
  }
  // Default to recurring (main page)
  return 'recurring';
}
