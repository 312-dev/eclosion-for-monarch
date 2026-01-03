/**
 * TanStack Query hooks for API data fetching and caching
 *
 * All tabs share the same cached data through these hooks.
 * Mutations automatically invalidate relevant caches.
 *
 * In demo mode, these hooks route to localStorage-based demoClient
 * instead of the production API.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../context/DemoContext';
import * as api from './client';
import * as demoApi from './demoClient';

// ============================================================================
// Query Keys
// ============================================================================

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  categoryGroups: ['categoryGroups'] as const,
  unmappedCategories: ['unmappedCategories'] as const,
  deletableCategories: ['deletableCategories'] as const,
  securityStatus: ['securityStatus'] as const,
  deploymentInfo: ['deploymentInfo'] as const,
  version: ['version'] as const,
  changelog: ['changelog'] as const,
  versionCheck: ['versionCheck'] as const,
  changelogStatus: ['changelogStatus'] as const,
};

// Helper to get query key with demo mode suffix
function getQueryKey(baseKey: readonly string[], isDemo: boolean): readonly string[] {
  return [...baseKey, isDemo ? 'demo' : 'prod'] as const;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Dashboard data - the main data source shared across all tabs
 * Contains: items, summary, config, ready_to_assign, rollup, last_sync
 */
export function useDashboardQuery(options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.dashboard, isDemo),
    queryFn: isDemo ? demoApi.getDashboard : api.getDashboard,
    staleTime: 2 * 60 * 1000, // Consider fresh for 2 minutes
    gcTime: 10 * 60 * 1000,   // Keep in cache for 10 minutes
    ...options,
  });
}

/**
 * Category groups for dropdown selections
 */
export function useCategoryGroupsQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.categoryGroups, isDemo),
    queryFn: isDemo ? demoApi.getCategoryGroups : api.getCategoryGroups,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Unmapped categories for linking
 */
export function useUnmappedCategoriesQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.unmappedCategories, isDemo),
    queryFn: isDemo ? demoApi.getUnmappedCategories : api.getUnmappedCategories,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Deletable categories for uninstall flow
 */
export function useDeletableCategoriesQuery(options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  // Demo mode doesn't support deletable categories
  return useQuery({
    queryKey: getQueryKey(queryKeys.deletableCategories, isDemo),
    queryFn: isDemo
      ? async () => ({ categories: [], count: 0 })
      : api.getDeletableCategories,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Security status
 */
export function useSecurityStatusQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.securityStatus, isDemo),
    queryFn: isDemo ? demoApi.getSecurityStatus : api.getSecurityStatus,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Deployment info
 */
export function useDeploymentInfoQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.deploymentInfo, isDemo),
    queryFn: isDemo ? demoApi.getDeploymentInfo : api.getDeploymentInfo,
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Trigger full sync - invalidates dashboard cache on success
 */
export function useSyncMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: isDemo ? demoApi.triggerSync : api.triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/**
 * Toggle item tracking
 */
export function useToggleItemMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recurringId, enabled }: { recurringId: string; enabled: boolean }) =>
      isDemo
        ? demoApi.toggleItemTracking(recurringId, enabled)
        : api.toggleItemTracking(recurringId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/**
 * Allocate funds to a category
 */
export function useAllocateFundsMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recurringId, amount }: { recurringId: string; amount: number }) =>
      isDemo
        ? demoApi.allocateFunds(recurringId, amount)
        : api.allocateFunds(recurringId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/**
 * Recreate a missing category
 */
export function useRecreateCategoryMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recurringId: string) =>
      isDemo
        ? demoApi.recreateCategory(recurringId)
        : api.recreateCategory(recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/**
 * Refresh/recalculate item target
 */
export function useRefreshItemMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recurringId: string) =>
      isDemo
        ? demoApi.refreshItem(recurringId)
        : api.refreshItem(recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/**
 * Change category group
 */
export function useChangeCategoryGroupMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recurringId, groupId, groupName }: { recurringId: string; groupId: string; groupName: string }) =>
      isDemo
        ? demoApi.changeCategoryGroup(recurringId, groupId, groupName)
        : api.changeCategoryGroup(recurringId, groupId, groupName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.categoryGroups, isDemo) });
    },
  });
}

/**
 * Update settings (auto-sync, threshold)
 */
export function useUpdateSettingsMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: { auto_sync_new?: boolean; auto_track_threshold?: number | null }) =>
      isDemo
        ? demoApi.updateSettings(settings)
        : api.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/**
 * Set initial config (target group)
 */
export function useSetConfigMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, groupName }: { groupId: string; groupName: string }) =>
      isDemo
        ? demoApi.setConfig(groupId, groupName)
        : api.setConfig(groupId, groupName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

// ============================================================================
// Rollup Mutations
// ============================================================================

/**
 * Add item to rollup
 */
export function useAddToRollupMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recurringId: string) =>
      isDemo
        ? demoApi.addToRollup(recurringId)
        : api.addToRollup(recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/**
 * Remove item from rollup
 */
export function useRemoveFromRollupMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recurringId: string) =>
      isDemo
        ? demoApi.removeFromRollup(recurringId)
        : api.removeFromRollup(recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/**
 * Set rollup budget
 */
export function useSetRollupBudgetMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) =>
      isDemo
        ? demoApi.setRollupBudget(amount)
        : api.setRollupBudget(amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/**
 * Update rollup emoji
 */
export function useUpdateRollupEmojiMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (emoji: string) =>
      isDemo
        ? demoApi.updateRollupEmoji(emoji)
        : api.updateRollupEmoji(emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/**
 * Update rollup category name
 */
export function useUpdateRollupNameMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      isDemo
        ? demoApi.updateRollupCategoryName(name)
        : api.updateRollupCategoryName(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

// ============================================================================
// Category Mutations
// ============================================================================

/**
 * Update category emoji
 */
export function useUpdateCategoryEmojiMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recurringId, emoji }: { recurringId: string; emoji: string }) =>
      isDemo
        ? demoApi.updateCategoryEmoji(recurringId, emoji)
        : api.updateCategoryEmoji(recurringId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/**
 * Update category name
 */
export function useUpdateCategoryNameMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recurringId, name }: { recurringId: string; name: string }) =>
      isDemo
        ? demoApi.updateCategoryName(recurringId, name)
        : api.updateCategoryName(recurringId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/**
 * Link item to existing category
 */
export function useLinkToCategoryMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recurringId, categoryId, syncName }: { recurringId: string; categoryId: string; syncName: boolean }) =>
      isDemo
        ? demoApi.linkToCategory(recurringId, categoryId, syncName)
        : api.linkToCategory(recurringId, categoryId, syncName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.unmappedCategories, isDemo) });
    },
  });
}

// ============================================================================
// Uninstall Mutations
// ============================================================================

/**
 * Delete all categories (uninstall)
 * Not supported in demo mode
 */
export function useDeleteAllCategoriesMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: isDemo
      ? async () => ({
          success: false,
          deleted: [],
          failed: [],
          deleted_count: 0,
          failed_count: 0,
          total_attempted: 0,
          state_reset: false,
        })
      : api.deleteAllCategories,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.deletableCategories, isDemo) });
    },
  });
}

/**
 * Cancel subscription (nuclear option)
 * Not supported in demo mode
 */
export function useCancelSubscriptionMutation() {
  const isDemo = useDemo();
  return useMutation({
    mutationFn: isDemo
      ? async () => ({
          success: false,
          steps_completed: [],
          railway_deletion_url: null,
          instructions: ['Not available in demo mode'],
          is_railway: false,
        })
      : api.cancelSubscription,
  });
}

// ============================================================================
// Helper: Invalidate all dashboard-related data
// ============================================================================

export function useInvalidateDashboard() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
  };
}

// ============================================================================
// Version Queries
// ============================================================================

/**
 * Get server version info
 */
export function useVersionQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.version, isDemo),
    queryFn: isDemo ? demoApi.getVersion : api.getVersion,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get changelog entries
 */
export function useChangelogQuery(limit?: number) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: [...getQueryKey(queryKeys.changelog, isDemo), limit],
    queryFn: () => (isDemo ? demoApi.getChangelog(limit) : api.getChangelog(limit)),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Check for version updates
 */
export function useVersionCheckQuery(clientVersion: string, options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: [...getQueryKey(queryKeys.versionCheck, isDemo), clientVersion],
    queryFn: () => (isDemo ? demoApi.checkVersion(clientVersion) : api.checkVersion(clientVersion)),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000, // Check every 30 minutes
    ...options,
  });
}

/**
 * Get changelog read status (has unread entries)
 */
export function useChangelogStatusQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.changelogStatus, isDemo),
    queryFn: isDemo ? demoApi.getChangelogStatus : api.getChangelogStatus,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mark changelog as read
 */
export function useMarkChangelogReadMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: isDemo ? demoApi.markChangelogRead : api.markChangelogRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.changelogStatus, isDemo) });
    },
  });
}
