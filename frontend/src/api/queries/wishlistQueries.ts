/**
 * Wishlist Queries
 *
 * Queries and mutations for wishlist items.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type {
  WishlistData,
  WishlistItem,
  WishlistLayoutUpdate,
  CreateWishlistItemRequest,
  UpdateWishlistItemRequest,
} from '../../types';
import {
  calculateMonthsRemaining,
  calculateProgressPercent,
  calculateShortfall,
} from '../../utils/savingsCalculations';
import { decodeHtmlEntities } from '../../utils';

/** Compute derived values for a wishlist item (uses backend's monthly_target). */
function computeWishlistItem(item: WishlistItem): WishlistItem {
  const monthsRemaining = calculateMonthsRemaining(item.target_date);
  // Use backend's monthly_target (calculated from rollover, not current balance)
  const monthlyTarget = item.monthly_target;
  const progressPercent = calculateProgressPercent(item.current_balance, item.amount);
  const shortfall = calculateShortfall(item.current_balance, item.amount);

  // Determine status
  let status: WishlistItem['status'];
  if (item.current_balance >= item.amount) {
    status = 'funded';
  } else if (item.planned_budget >= monthlyTarget) {
    status = item.planned_budget > monthlyTarget ? 'ahead' : 'on_track';
  } else {
    status = 'behind';
  }

  return {
    ...item,
    // Decode HTML entities in string fields (API encodes for XSS protection)
    name: decodeHtmlEntities(item.name),
    // Only include source_url if it exists (exactOptionalPropertyTypes)
    ...(item.source_url && { source_url: decodeHtmlEntities(item.source_url) }),
    category_name: decodeHtmlEntities(item.category_name),
    category_group_name: item.category_group_name
      ? decodeHtmlEntities(item.category_group_name)
      : null,
    months_remaining: monthsRemaining,
    monthly_target: monthlyTarget,
    progress_percent: progressPercent,
    shortfall,
    status,
  };
}

/** Transform wishlist data by computing all derived values. */
function transformWishlistData(data: WishlistData): WishlistData {
  const items = data.items.map(computeWishlistItem);
  const archivedItems = data.archived_items.map(computeWishlistItem);

  // Compute totals from active items only
  const totalTarget = items.reduce((sum, item) => sum + item.amount, 0);
  const totalSaved = items.reduce((sum, item) => sum + item.current_balance, 0);
  const totalMonthlyTarget = items.reduce((sum, item) => sum + item.monthly_target, 0);

  return {
    items,
    archived_items: archivedItems,
    total_target: totalTarget,
    total_saved: totalSaved,
    total_monthly_target: totalMonthlyTarget,
  };
}

/** Wishlist data query - fetches all wishlist items */
export function useWishlistQuery(options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.wishlist, isDemo),
    queryFn: async () => {
      const data = isDemo ? await demoApi.getWishlist() : await api.getWishlist();
      return transformWishlistData(data);
    },
    staleTime: 2 * 60 * 1000, // Consider fresh for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    ...options,
  });
}

/** Create wishlist item mutation */
export function useCreateWishlistMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateWishlistItemRequest) =>
      isDemo ? demoApi.createWishlistItem(request) : api.createWishlistItem(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.wishlist, isDemo) });
    },
  });
}

/** Update wishlist item mutation */
export function useUpdateWishlistMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateWishlistItemRequest }) =>
      isDemo ? demoApi.updateWishlistItem(id, updates) : api.updateWishlistItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.wishlist, isDemo) });
    },
  });
}

/** Archive wishlist item mutation */
export function useArchiveWishlistMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      isDemo ? demoApi.archiveWishlistItem(id) : api.archiveWishlistItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.wishlist, isDemo) });
    },
  });
}

/** Unarchive (restore) wishlist item mutation */
export function useUnarchiveWishlistMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      isDemo ? demoApi.unarchiveWishlistItem(id) : api.unarchiveWishlistItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.wishlist, isDemo) });
    },
  });
}

/** Delete wishlist item mutation (optionally also deletes linked category) */
export function useDeleteWishlistMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deleteCategory = false }: { id: string; deleteCategory?: boolean }) =>
      isDemo
        ? demoApi.deleteWishlistItem(id, deleteCategory)
        : api.deleteWishlistItem(id, deleteCategory),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.wishlist, isDemo) });
    },
  });
}

/** Allocate funds to wishlist item (also invalidates dashboard for Left to Budget) */
export function useAllocateWishlistMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      isDemo ? demoApi.allocateWishlistFunds(id, amount) : api.allocateWishlistFunds(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.wishlist, isDemo) });
      // Invalidate dashboard to update Left to Budget badge
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/** Change category group for wishlist item */
export function useChangeWishlistGroupMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, groupId, groupName }: { id: string; groupId: string; groupName: string }) =>
      isDemo
        ? demoApi.changeWishlistGroup(id, groupId, groupName)
        : api.changeWishlistGroup(id, groupId, groupName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.wishlist, isDemo) });
    },
  });
}

/** Link category to wishlist item (for restoring archived items with deleted categories) */
export function useLinkWishlistCategoryMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      categoryGroupId,
      existingCategoryId,
    }: {
      id: string;
      categoryGroupId?: string;
      existingCategoryId?: string;
    }) => {
      const params: { categoryGroupId?: string; existingCategoryId?: string } = {};
      if (categoryGroupId) params.categoryGroupId = categoryGroupId;
      if (existingCategoryId) params.existingCategoryId = existingCategoryId;
      return isDemo
        ? demoApi.linkWishlistCategory(id, params)
        : api.linkWishlistCategory(id, params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.wishlist, isDemo) });
    },
  });
}

/** Sync wishlist data from Monarch */
export function useWishlistSyncMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => (isDemo ? demoApi.syncWishlist() : api.syncWishlist()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.wishlist, isDemo) });
    },
  });
}

/** Update wishlist item layouts (position and size) for drag-drop and resizing */
export function useUpdateWishlistLayoutMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (layouts: WishlistLayoutUpdate[]) =>
      isDemo ? demoApi.updateWishlistLayouts(layouts) : api.updateWishlistLayouts(layouts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.wishlist, isDemo) });
    },
  });
}

/** Helper: Invalidate wishlist data */
export function useInvalidateWishlist() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.wishlist, isDemo) });
  };
}

// Re-export config and category group queries from dedicated module
export {
  useWishlistConfigQuery,
  useUpdateWishlistConfigMutation,
  useIsWishlistConfigured,
  useWishlistCategoryGroupsQuery,
} from './wishlistConfigQueries';

// Re-export pending bookmarks queries from dedicated module
export {
  usePendingBookmarksQuery,
  usePendingCountQuery,
  useSkippedBookmarksQuery,
  useSkipPendingMutation,
  useConvertPendingMutation,
  useImportBookmarksMutation,
  useClearUnconvertedBookmarksMutation,
  useInvalidatePendingBookmarks,
} from './wishlistPendingQueries';
