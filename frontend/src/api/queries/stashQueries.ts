/**
 * Stash Queries
 *
 * Queries and mutations for stash items.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type {
  StashData,
  StashItem,
  StashLayoutUpdate,
  CreateStashItemRequest,
  UpdateStashItemRequest,
  SaveHypothesisRequest,
} from '../../types';
import {
  calculateMonthsRemaining,
  calculateProgressPercent,
  calculateShortfall,
} from '../../utils/savingsCalculations';
import { decodeHtmlEntities } from '../../utils';

/** Compute derived values for a stash item (uses backend's monthly_target). */
function computeStashItem(item: StashItem): StashItem {
  const monthsRemaining = calculateMonthsRemaining(item.target_date);
  // Use backend's monthly_target (calculated from rollover, not current balance)
  const monthlyTarget = item.monthly_target;
  const progressPercent = calculateProgressPercent(item.current_balance, item.amount);
  const shortfall = calculateShortfall(item.current_balance, item.amount);

  // Determine status
  let status: StashItem['status'];
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

/** Transform stash data by computing all derived values. */
function transformStashData(data: StashData): StashData {
  const items = data.items.map(computeStashItem);
  const archivedItems = data.archived_items.map(computeStashItem);

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

/** Stash data query - fetches all stash items */
export function useStashQuery(options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.stash, isDemo),
    queryFn: async () => {
      const data = isDemo ? await demoApi.getStash() : await api.getStash();
      return transformStashData(data);
    },
    // Use reasonable staleTime - mutations invalidate the query for fresh data
    staleTime: 30 * 1000, // Consider stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes for navigation
    ...options,
  });
}

/** Create stash item mutation */
export function useCreateStashMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateStashItemRequest) =>
      isDemo ? demoApi.createStashItem(request) : api.createStashItem(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.availableToStash, isDemo) });
    },
  });
}

/** Update stash item mutation */
export function useUpdateStashMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateStashItemRequest }) =>
      isDemo ? demoApi.updateStashItem(id, updates) : api.updateStashItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
    },
  });
}

/** Archive stash item mutation */
export function useArchiveStashMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => (isDemo ? demoApi.archiveStashItem(id) : api.archiveStashItem(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
    },
  });
}

/** Unarchive (restore) stash item mutation */
export function useUnarchiveStashMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      isDemo ? demoApi.unarchiveStashItem(id) : api.unarchiveStashItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
    },
  });
}

/** Complete a one-time purchase goal (mark as purchased and archive) */
export function useCompleteStashMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, releaseFunds = false }: { id: string; releaseFunds?: boolean }) =>
      isDemo
        ? demoApi.completeStashItem(id, releaseFunds)
        : api.completeStashItem(id, releaseFunds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.availableToStash, isDemo) });
      // If funds were released, invalidate dashboard to update Left to Budget badge
      if (variables.releaseFunds) {
        queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
      }
    },
  });
}

/** Uncomplete a one-time purchase goal (move back to active) */
export function useUncompleteStashMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      isDemo ? demoApi.uncompleteStashItem(id) : api.uncompleteStashItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
    },
  });
}

/** Delete stash item mutation (optionally also deletes linked category) */
export function useDeleteStashMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deleteCategory = false }: { id: string; deleteCategory?: boolean }) =>
      isDemo
        ? demoApi.deleteStashItem(id, deleteCategory)
        : api.deleteStashItem(id, deleteCategory),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.availableToStash, isDemo) });
      // If category was deleted, invalidate dashboard to update Left to Budget badge
      if (variables.deleteCategory) {
        queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
      }
    },
  });
}

/** Allocate funds to stash item (also invalidates dashboard for Left to Budget) */
export function useAllocateStashMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      isDemo ? demoApi.allocateStashFunds(id, amount) : api.allocateStashFunds(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
      // Invalidate dashboard to update Left to Budget badge
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
      // Invalidate available-to-stash since stash balances changed
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.availableToStash, isDemo) });
    },
  });
}

/** Batch allocation request type */
interface BatchAllocation {
  id: string;
  budget: number;
}

/** Allocate funds to multiple stash items at once (used by Distribute feature) */
export function useAllocateStashBatchMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (allocations: BatchAllocation[]) =>
      isDemo
        ? demoApi.allocateStashFundsBatch(allocations)
        : api.allocateStashFundsBatch(allocations),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.availableToStash, isDemo) });
    },
  });
}

/** Change category group for stash item */
export function useChangeStashGroupMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, groupId, groupName }: { id: string; groupId: string; groupName: string }) =>
      isDemo
        ? demoApi.changeStashGroup(id, groupId, groupName)
        : api.changeStashGroup(id, groupId, groupName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
    },
  });
}

/** Link category to stash item (for restoring archived items with deleted categories) */
export function useLinkStashCategoryMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      categoryGroupId,
      existingCategoryId,
      flexibleGroupId,
    }: {
      id: string;
      categoryGroupId?: string;
      existingCategoryId?: string;
      flexibleGroupId?: string;
    }) => {
      const params: {
        categoryGroupId?: string;
        existingCategoryId?: string;
        flexibleGroupId?: string;
      } = {};
      if (categoryGroupId) params.categoryGroupId = categoryGroupId;
      if (existingCategoryId) params.existingCategoryId = existingCategoryId;
      if (flexibleGroupId) params.flexibleGroupId = flexibleGroupId;
      return isDemo ? demoApi.linkStashCategory(id, params) : api.linkStashCategory(id, params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
    },
  });
}

/** Sync stash data from Monarch */
export function useStashSyncMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => (isDemo ? demoApi.syncStash() : api.syncStash()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.availableToStash, isDemo) });
      // Invalidate history so Reports tab refreshes after sync
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stashHistory, isDemo) });
      // Invalidate Monarch goals so deleted/added goals are reflected
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.monarchGoals, isDemo) });
      // Invalidate dashboard to update Left to Budget (goal changes affect budgets)
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/** Update stash item layouts (position and size) for drag-drop and resizing */
export function useUpdateStashLayoutMutation() {
  const isDemo = useDemo();
  return useMutation({
    mutationFn: async (layouts: StashLayoutUpdate[]) => {
      const result = isDemo ? await demoApi.updateStashLayouts(layouts) : await api.updateStashLayouts(layouts);
      return result;
    },
    // Note: We intentionally do NOT invalidate the stash query here.
    // The grid component manages layout state locally. Invalidating would
    // cause a refetch → new sort_order → layout recreation → infinite loop.
  });
}

/** Helper: Invalidate stash data */
export function useInvalidateStash() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
  };
}

/** Update category rollover starting balance (used by Distribute wizard for rollover portion) */
export function useUpdateCategoryRolloverMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, amount }: { categoryId: string; amount: number }) =>
      isDemo
        ? demoApi.updateCategoryRolloverBalance(categoryId, amount)
        : api.updateCategoryRolloverBalance(categoryId, amount),
    onSuccess: () => {
      // Invalidate stash to reflect updated balances
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
      // Invalidate available-to-stash since stash balances changed
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.availableToStash, isDemo) });
    },
  });
}

/** Update category group rollover starting balance (used by Distribute wizard for flexible groups) */
export function useUpdateGroupRolloverMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, amount }: { groupId: string; amount: number }) =>
      isDemo
        ? demoApi.updateGroupRolloverBalance(groupId, amount)
        : api.updateGroupRolloverBalance(groupId, amount),
    onSuccess: () => {
      // Invalidate stash to reflect updated balances
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
      // Invalidate available-to-stash since stash balances changed
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.availableToStash, isDemo) });
    },
  });
}

// ---- Hypothesis Queries and Mutations ----

/** Fetch all saved hypotheses */
export function useHypothesesQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.stashHypotheses, isDemo),
    queryFn: async () => {
      const response = isDemo ? await demoApi.getHypotheses() : await api.getHypotheses();
      // Transform snake_case API response to camelCase frontend types
      return response.hypotheses.map((h) => ({
        id: h.id,
        name: h.name,
        savingsAllocations: h.savings_allocations,
        savingsTotal: h.savings_total,
        monthlyAllocations: h.monthly_allocations,
        monthlyTotal: h.monthly_total,
        events: h.events,
        createdAt: h.created_at ?? new Date().toISOString(),
        updatedAt: h.updated_at ?? new Date().toISOString(),
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/** Save or update a hypothesis */
export function useSaveHypothesisMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SaveHypothesisRequest) =>
      isDemo ? demoApi.saveHypothesis(request) : api.saveHypothesis(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stashHypotheses, isDemo) });
    },
  });
}

/** Delete a hypothesis */
export function useDeleteHypothesisMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => (isDemo ? demoApi.deleteHypothesis(id) : api.deleteHypothesis(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stashHypotheses, isDemo) });
    },
  });
}

// Re-export config and category group queries from dedicated module
export {
  useStashConfigQuery,
  useUpdateStashConfigMutation,
  useIsStashConfigured,
  useStashCategoryGroupsQuery,
} from './stashConfigQueries';

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
} from './stashPendingQueries';
