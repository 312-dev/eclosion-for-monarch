/* eslint-disable max-lines */
/**
 * Stash Queries
 *
 * Queries and mutations for stash items.
 * Uses smart invalidation from the dependency registry for consistent cache management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import { useSmartInvalidate } from '../../hooks/useSmartInvalidate';
import type {
  StashData,
  StashItem,
  StashLayoutUpdate,
  CreateStashItemRequest,
  UpdateStashItemRequest,
  SaveHypothesisRequest,
  DashboardData,
  AvailableToStashData,
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
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (request: CreateStashItemRequest) =>
      isDemo ? demoApi.createStashItem(request) : api.createStashItem(request),
    onSuccess: () => {
      smartInvalidate('createStash');
    },
  });
}

/** Update stash item mutation with optimistic updates for instant UI feedback */
export function useUpdateStashMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.stash, isDemo);

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateStashItemRequest }) =>
      isDemo ? demoApi.updateStashItem(id, updates) : api.updateStashItem(id, updates),

    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<StashData>(queryKey);

      // Optimistically update the cache
      if (previousData) {
        queryClient.setQueryData<StashData>(queryKey, (old) => {
          if (!old) return old;

          const updateItem = (item: StashItem): StashItem => {
            if (item.id !== id) return item;
            // Build updated item, handling optional properties correctly
            const updated: StashItem = { ...item };

            // Apply each update field, converting null to delete for optional string props
            if (updates.name !== undefined) updated.name = updates.name;
            if (updates.amount !== undefined) updated.amount = updates.amount;
            if (updates.target_date !== undefined) updated.target_date = updates.target_date;
            if (updates.emoji !== undefined) updated.emoji = updates.emoji;
            if (updates.is_enabled !== undefined) updated.is_enabled = updates.is_enabled;
            if (updates.goal_type !== undefined) updated.goal_type = updates.goal_type;

            // Handle nullable optional string properties
            if (updates.source_url === null) {
              delete updated.source_url;
            } else if (updates.source_url !== undefined) {
              updated.source_url = updates.source_url;
            }

            if (updates.custom_image_path === null) {
              delete updated.custom_image_path;
            } else if (updates.custom_image_path !== undefined) {
              updated.custom_image_path = updates.custom_image_path;
            }

            if (updates.image_attribution === null) {
              delete updated.image_attribution;
            } else if (updates.image_attribution !== undefined) {
              updated.image_attribution = updates.image_attribution;
            }

            if (updates.tracking_start_date === null) {
              delete updated.tracking_start_date;
            } else if (updates.tracking_start_date !== undefined) {
              updated.tracking_start_date = updates.tracking_start_date;
            }

            return computeStashItem(updated);
          };

          return {
            ...old,
            items: old.items.map(updateItem),
            archived_items: old.archived_items.map(updateItem),
          };
        });
      }

      // Return context with previous data for rollback
      return { previousData };
    },

    onError: (_err, _variables, context) => {
      // Rollback to previous data on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      // Always refetch after error or success to ensure server sync
      smartInvalidate('updateStash');
    },
  });
}

/** Archive stash item mutation with optimistic updates */
export function useArchiveStashMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.stash, isDemo);

  return useMutation({
    mutationFn: (id: string) => (isDemo ? demoApi.archiveStashItem(id) : api.archiveStashItem(id)),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<StashData>(queryKey);

      if (previousData) {
        queryClient.setQueryData<StashData>(queryKey, (old) => {
          if (!old) return old;
          const itemToArchive = old.items.find((item) => item.id === id);
          if (!itemToArchive) return old;

          const archivedItem: StashItem = {
            ...itemToArchive,
            is_archived: true,
            archived_at: new Date().toISOString(),
          };

          return {
            ...old,
            items: old.items.filter((item) => item.id !== id),
            archived_items: [...old.archived_items, archivedItem],
          };
        });
      }

      return { previousData };
    },

    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      smartInvalidate('archiveStash');
    },
  });
}

/** Unarchive (restore) stash item mutation with optimistic updates */
export function useUnarchiveStashMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.stash, isDemo);

  return useMutation({
    mutationFn: (id: string) =>
      isDemo ? demoApi.unarchiveStashItem(id) : api.unarchiveStashItem(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<StashData>(queryKey);

      if (previousData) {
        queryClient.setQueryData<StashData>(queryKey, (old) => {
          if (!old) return old;
          const itemToRestore = old.archived_items.find((item) => item.id === id);
          if (!itemToRestore) return old;

          // Create restored item, removing archived_at property
          const { archived_at: _, ...itemWithoutArchivedAt } = itemToRestore;
          const restoredItem: StashItem = {
            ...itemWithoutArchivedAt,
            is_archived: false,
          };

          return {
            ...old,
            items: [...old.items, restoredItem],
            archived_items: old.archived_items.filter((item) => item.id !== id),
          };
        });
      }

      return { previousData };
    },

    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      smartInvalidate('unarchiveStash');
    },
  });
}

/** Complete a one-time purchase goal (mark as purchased and archive) with optimistic updates */
export function useCompleteStashMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.stash, isDemo);

  return useMutation({
    mutationFn: ({ id, releaseFunds = false }: { id: string; releaseFunds?: boolean }) =>
      isDemo
        ? demoApi.completeStashItem(id, releaseFunds)
        : api.completeStashItem(id, releaseFunds),

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<StashData>(queryKey);

      if (previousData) {
        queryClient.setQueryData<StashData>(queryKey, (old) => {
          if (!old) return old;
          const itemToComplete = old.items.find((item) => item.id === id);
          if (!itemToComplete) return old;

          const completedItem: StashItem = {
            ...itemToComplete,
            is_archived: true,
            archived_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          };

          return {
            ...old,
            items: old.items.filter((item) => item.id !== id),
            archived_items: [...old.archived_items, completedItem],
          };
        });
      }

      return { previousData };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      smartInvalidate('completeStash');
    },
  });
}

/** Uncomplete a one-time purchase goal (move back to active) with optimistic updates */
export function useUncompleteStashMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.stash, isDemo);

  return useMutation({
    mutationFn: (id: string) =>
      isDemo ? demoApi.uncompleteStashItem(id) : api.uncompleteStashItem(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<StashData>(queryKey);

      if (previousData) {
        queryClient.setQueryData<StashData>(queryKey, (old) => {
          if (!old) return old;
          const itemToRestore = old.archived_items.find((item) => item.id === id);
          if (!itemToRestore) return old;

          // Create restored item, removing archived_at and completed_at properties
          const { archived_at: _a, completed_at: _c, ...itemWithoutDates } = itemToRestore;
          const restoredItem: StashItem = {
            ...itemWithoutDates,
            is_archived: false,
          };

          return {
            ...old,
            items: [...old.items, restoredItem],
            archived_items: old.archived_items.filter((item) => item.id !== id),
          };
        });
      }

      return { previousData };
    },

    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      smartInvalidate('uncompleteStash');
    },
  });
}

/** Delete stash item mutation with optimistic updates (optionally also deletes linked category) */
export function useDeleteStashMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.stash, isDemo);

  return useMutation({
    mutationFn: ({ id, deleteCategory = false }: { id: string; deleteCategory?: boolean }) =>
      isDemo
        ? demoApi.deleteStashItem(id, deleteCategory)
        : api.deleteStashItem(id, deleteCategory),

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<StashData>(queryKey);

      if (previousData) {
        queryClient.setQueryData<StashData>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((item) => item.id !== id),
            archived_items: old.archived_items.filter((item) => item.id !== id),
          };
        });
      }

      return { previousData };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      smartInvalidate('deleteStash');
    },
  });
}

/** Allocate funds to stash item with optimistic updates for instant UI feedback */
export function useAllocateStashMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const stashKey = getQueryKey(queryKeys.stash, isDemo);
  const dashboardKey = getQueryKey(queryKeys.dashboard, isDemo);

  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      isDemo ? demoApi.allocateStashFunds(id, amount) : api.allocateStashFunds(id, amount),

    onMutate: async ({ id, amount }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: stashKey });
      await queryClient.cancelQueries({ queryKey: dashboardKey });

      // Snapshot the previous values
      const previousStash = queryClient.getQueryData<StashData>(stashKey);
      const previousDashboard = queryClient.getQueryData<DashboardData>(dashboardKey);

      // Calculate the budget delta for ready_to_assign adjustment
      const oldBudget = previousStash?.items.find((i) => i.id === id)?.planned_budget ?? 0;
      const budgetDelta = amount - oldBudget;

      // Optimistically update stash cache
      if (previousStash) {
        queryClient.setQueryData<StashData>(stashKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === id ? computeStashItem({ ...item, planned_budget: amount }) : item
            ),
          };
        });
      }

      // Optimistically update dashboard's ready_to_assign
      if (previousDashboard && budgetDelta !== 0) {
        queryClient.setQueryData<DashboardData>(dashboardKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            ready_to_assign: {
              ...old.ready_to_assign,
              ready_to_assign: old.ready_to_assign.ready_to_assign - budgetDelta,
            },
          };
        });
      }

      // Return context with previous data for rollback
      return { previousStash, previousDashboard };
    },

    onError: (_err, _variables, context) => {
      // Rollback to previous data on error
      if (context?.previousStash) {
        queryClient.setQueryData(stashKey, context.previousStash);
      }
      if (context?.previousDashboard) {
        queryClient.setQueryData(dashboardKey, context.previousDashboard);
      }
    },

    onSettled: () => {
      // NOTE: We intentionally do NOT invalidate/refetch here.
      // Monarch has eventual consistency - a refetch immediately after write
      // may return stale data, overwriting our correct optimistic updates.
      // Let the normal staleTime (30s) handle eventual sync with Monarch.
    },
  });
}

/** Batch allocation request type */
interface BatchAllocation {
  id: string;
  budget: number;
}

/** Allocate funds to multiple stash items at once with optimistic updates (used by Distribute feature) */
export function useAllocateStashBatchMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const stashKey = getQueryKey(queryKeys.stash, isDemo);
  const dashboardKey = getQueryKey(queryKeys.dashboard, isDemo);

  return useMutation({
    mutationFn: (allocations: BatchAllocation[]) =>
      isDemo
        ? demoApi.allocateStashFundsBatch(allocations)
        : api.allocateStashFundsBatch(allocations),

    onMutate: async (allocations) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: stashKey });
      await queryClient.cancelQueries({ queryKey: dashboardKey });

      // Snapshot the previous values
      const previousStash = queryClient.getQueryData<StashData>(stashKey);
      const previousDashboard = queryClient.getQueryData<DashboardData>(dashboardKey);

      // Calculate total budget delta for ready_to_assign adjustment
      let totalBudgetDelta = 0;
      if (previousStash) {
        const budgetMap = new Map(allocations.map((a) => [a.id, a.budget]));
        for (const item of previousStash.items) {
          if (budgetMap.has(item.id)) {
            const oldBudget = item.planned_budget;
            const newBudget = budgetMap.get(item.id)!;
            totalBudgetDelta += newBudget - oldBudget;
          }
        }
      }

      // Optimistically update stash cache
      if (previousStash) {
        const budgetMap = new Map(allocations.map((a) => [a.id, a.budget]));
        queryClient.setQueryData<StashData>(stashKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              budgetMap.has(item.id)
                ? computeStashItem({ ...item, planned_budget: budgetMap.get(item.id)! })
                : item
            ),
          };
        });
      }

      // Optimistically update dashboard's ready_to_assign
      if (previousDashboard && totalBudgetDelta !== 0) {
        queryClient.setQueryData<DashboardData>(dashboardKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            ready_to_assign: {
              ...old.ready_to_assign,
              ready_to_assign: old.ready_to_assign.ready_to_assign - totalBudgetDelta,
            },
          };
        });
      }

      // Return context with previous data for rollback
      return { previousStash, previousDashboard };
    },

    onError: (_err, _variables, context) => {
      // Rollback to previous data on error
      if (context?.previousStash) {
        queryClient.setQueryData(stashKey, context.previousStash);
      }
      if (context?.previousDashboard) {
        queryClient.setQueryData(dashboardKey, context.previousDashboard);
      }
    },

    onSettled: () => {
      // NOTE: We intentionally do NOT invalidate/refetch here.
      // Monarch has eventual consistency - a refetch immediately after write
      // may return stale data, overwriting our correct optimistic updates.
      // Let the normal staleTime (30s) handle eventual sync with Monarch.
    },
  });
}

/** Change category group for stash item with optimistic updates */
export function useChangeStashGroupMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.stash, isDemo);

  return useMutation({
    mutationFn: ({ id, groupId, groupName }: { id: string; groupId: string; groupName: string }) =>
      isDemo
        ? demoApi.changeStashGroup(id, groupId, groupName)
        : api.changeStashGroup(id, groupId, groupName),

    onMutate: async ({ id, groupId, groupName }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<StashData>(queryKey);

      if (previousData) {
        queryClient.setQueryData<StashData>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === id
                ? { ...item, category_group_id: groupId, category_group_name: groupName }
                : item
            ),
            archived_items: old.archived_items.map((item) =>
              item.id === id
                ? { ...item, category_group_id: groupId, category_group_name: groupName }
                : item
            ),
          };
        });
      }

      return { previousData };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      smartInvalidate('changeStashGroup');
    },
  });
}

/** Link category to stash item with optimistic updates (for restoring archived items with deleted categories) */
export function useLinkStashCategoryMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.stash, isDemo);

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

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<StashData>(queryKey);

      // Mark the item as having a category (the actual category details will come from server)
      if (previousData) {
        queryClient.setQueryData<StashData>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === id ? { ...item, has_category: true } : item
            ),
            archived_items: old.archived_items.map((item) =>
              item.id === id ? { ...item, has_category: true } : item
            ),
          };
        });
      }

      return { previousData };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      smartInvalidate('linkStashCategory');
    },
  });
}

/** Sync stash data from Monarch */
export function useStashSyncMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: () => (isDemo ? demoApi.syncStash() : api.syncStash()),
    onSuccess: () => {
      smartInvalidate('stashSync');
    },
  });
}

/** Update stash item layouts (position and size) for drag-drop and resizing */
export function useUpdateStashLayoutMutation() {
  const isDemo = useDemo();
  return useMutation({
    mutationFn: async (layouts: StashLayoutUpdate[]) => {
      const result = isDemo
        ? await demoApi.updateStashLayouts(layouts)
        : await api.updateStashLayouts(layouts);
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

/** Update category rollover starting balance with optimistic updates */
export function useUpdateCategoryRolloverMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const stashKey = getQueryKey(queryKeys.stash, isDemo);
  const availableKey = getQueryKey(queryKeys.availableToStash, isDemo);

  return useMutation({
    mutationFn: ({ categoryId, amount }: { categoryId: string; amount: number }) =>
      isDemo
        ? demoApi.updateCategoryRolloverBalance(categoryId, amount)
        : api.updateCategoryRolloverBalance(categoryId, amount),

    onMutate: async ({ categoryId, amount }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: stashKey });
      await queryClient.cancelQueries({ queryKey: availableKey });

      // Snapshot previous values
      const previousStash = queryClient.getQueryData<StashData>(stashKey);
      const previousAvailable = queryClient.getQueryData<AvailableToStashData>(availableKey);

      // Optimistically update stash cache
      if (previousStash) {
        queryClient.setQueryData<StashData>(stashKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) => {
              if (item.category_id !== categoryId) return item;
              // Update rollover-related fields
              const newRollover = (item.rollover_amount ?? 0) + amount;
              const newBalance = item.current_balance + amount;
              const newAvailable = (item.available_to_spend ?? 0) + amount;
              return computeStashItem({
                ...item,
                rollover_amount: Math.max(0, newRollover),
                current_balance: Math.max(0, newBalance),
                available_to_spend: Math.max(0, newAvailable),
              });
            }),
          };
        });
      }

      // Optimistically update available-to-stash cache
      // Deposits increase stash balance, reducing available funds
      if (previousAvailable) {
        queryClient.setQueryData<AvailableToStashData>(availableKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            stashBalances: old.stashBalances + amount,
          };
        });
      }

      return { previousStash, previousAvailable };
    },

    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousStash) {
        queryClient.setQueryData(stashKey, context.previousStash);
      }
      if (context?.previousAvailable) {
        queryClient.setQueryData(availableKey, context.previousAvailable);
      }
    },

    onSettled: () => {
      // NOTE: We intentionally do NOT invalidate/refetch here.
      // Monarch has eventual consistency - a refetch immediately after write
      // may return stale data, overwriting our correct optimistic updates.
      // The optimistic updates in onMutate are correct (the mutation was confirmed).
      // Let the normal staleTime (30s) handle eventual sync with Monarch.
    },
  });
}

/** Update category group rollover starting balance with optimistic updates */
export function useUpdateGroupRolloverMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const stashKey = getQueryKey(queryKeys.stash, isDemo);
  const availableKey = getQueryKey(queryKeys.availableToStash, isDemo);

  return useMutation({
    mutationFn: ({ groupId, amount }: { groupId: string; amount: number }) =>
      isDemo
        ? demoApi.updateGroupRolloverBalance(groupId, amount)
        : api.updateGroupRolloverBalance(groupId, amount),

    onMutate: async ({ groupId, amount }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: stashKey });
      await queryClient.cancelQueries({ queryKey: availableKey });

      // Snapshot previous values
      const previousStash = queryClient.getQueryData<StashData>(stashKey);
      const previousAvailable = queryClient.getQueryData<AvailableToStashData>(availableKey);

      // Optimistically update stash cache for flexible group items
      if (previousStash) {
        queryClient.setQueryData<StashData>(stashKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) => {
              // Match flexible group items by category_group_id
              if (!item.is_flexible_group || item.category_group_id !== groupId) return item;
              // Update rollover-related fields
              const newRollover = (item.rollover_amount ?? 0) + amount;
              const newBalance = item.current_balance + amount;
              const newAvailable = (item.available_to_spend ?? 0) + amount;
              return computeStashItem({
                ...item,
                rollover_amount: Math.max(0, newRollover),
                current_balance: Math.max(0, newBalance),
                available_to_spend: Math.max(0, newAvailable),
              });
            }),
          };
        });
      }

      // Optimistically update available-to-stash cache
      // Deposits increase stash balance, reducing available funds
      if (previousAvailable) {
        queryClient.setQueryData<AvailableToStashData>(availableKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            stashBalances: old.stashBalances + amount,
          };
        });
      }

      return { previousStash, previousAvailable };
    },

    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousStash) {
        queryClient.setQueryData(stashKey, context.previousStash);
      }
      if (context?.previousAvailable) {
        queryClient.setQueryData(availableKey, context.previousAvailable);
      }
    },

    onSettled: () => {
      // NOTE: We intentionally do NOT invalidate/refetch here.
      // Monarch has eventual consistency - a refetch immediately after write
      // may return stale data, overwriting our correct optimistic updates.
      // The optimistic updates in onMutate are correct (the mutation was confirmed).
      // Let the normal staleTime (30s) handle eventual sync with Monarch.
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
        customAvailableFunds: h.custom_available_funds,
        customLeftToBudget: h.custom_left_to_budget,
        itemApys: h.item_apys ?? {},
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
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (request: SaveHypothesisRequest) =>
      isDemo ? demoApi.saveHypothesis(request) : api.saveHypothesis(request),
    onSuccess: () => {
      smartInvalidate('saveHypothesis');
    },
  });
}

/** Delete a hypothesis */
export function useDeleteHypothesisMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (id: string) => (isDemo ? demoApi.deleteHypothesis(id) : api.deleteHypothesis(id)),
    onSuccess: () => {
      smartInvalidate('deleteHypothesis');
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
