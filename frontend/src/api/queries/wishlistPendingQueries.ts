/**
 * Wishlist Pending Bookmarks Queries
 *
 * Queries and mutations for pending bookmark review functionality.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type { PendingBookmark, ImportBookmark } from '../../types';

/**
 * Pending bookmarks query - fetches bookmarks awaiting review
 */
export function usePendingBookmarksQuery(options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.pendingBookmarks, isDemo),
    queryFn: async (): Promise<PendingBookmark[]> => {
      const response = isDemo
        ? await demoApi.getPendingBookmarks()
        : await api.getPendingBookmarks();
      return response.bookmarks;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Pending bookmarks count query - for banner display
 */
export function usePendingCountQuery(options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.pendingBookmarksCount, isDemo),
    queryFn: async (): Promise<number> => {
      const response = isDemo ? await demoApi.getPendingCount() : await api.getPendingCount();
      return response.count;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Skipped/ignored bookmarks query - for Ignored Bookmarks section
 */
export function useSkippedBookmarksQuery(options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.skippedBookmarks, isDemo),
    queryFn: async (): Promise<PendingBookmark[]> => {
      const response = isDemo
        ? await demoApi.getSkippedBookmarks()
        : await api.getSkippedBookmarks();
      return response.bookmarks;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Skip pending bookmark mutation
 */
export function useSkipPendingMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      isDemo ? demoApi.skipPendingBookmark(id) : api.skipPendingBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.pendingBookmarks, isDemo) });
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.pendingBookmarksCount, isDemo),
      });
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.skippedBookmarks, isDemo) });
    },
  });
}

/**
 * Convert pending bookmark mutation
 */
export function useConvertPendingMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      isDemo ? demoApi.convertPendingBookmark(id) : api.convertPendingBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.pendingBookmarks, isDemo) });
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.pendingBookmarksCount, isDemo),
      });
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.skippedBookmarks, isDemo) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.wishlist, isDemo) });
    },
  });
}

/**
 * Import bookmarks mutation
 */
export function useImportBookmarksMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookmarks: ImportBookmark[]) =>
      isDemo ? demoApi.importBookmarks(bookmarks) : api.importBookmarks(bookmarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.pendingBookmarks, isDemo) });
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.pendingBookmarksCount, isDemo),
      });
    },
  });
}

/**
 * Clear unconverted pending bookmarks mutation
 */
export function useClearUnconvertedBookmarksMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      isDemo ? demoApi.clearUnconvertedBookmarks() : api.clearUnconvertedBookmarks(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.pendingBookmarks, isDemo) });
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.pendingBookmarksCount, isDemo),
      });
    },
  });
}

/**
 * Helper: Invalidate pending bookmarks data
 */
export function useInvalidatePendingBookmarks() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.pendingBookmarks, isDemo) });
    queryClient.invalidateQueries({
      queryKey: getQueryKey(queryKeys.pendingBookmarksCount, isDemo),
    });
  };
}
