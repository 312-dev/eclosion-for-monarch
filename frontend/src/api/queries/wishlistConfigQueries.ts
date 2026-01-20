/**
 * Wishlist Configuration Queries
 *
 * Queries and mutations for wishlist configuration and category groups.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type { WishlistConfig } from '../../types';

/**
 * Transform backend config (snake_case) to frontend format (camelCase).
 */
function transformWishlistConfig(raw: Record<string, unknown>): WishlistConfig {
  return {
    isConfigured: Boolean(raw['is_configured']),
    defaultCategoryGroupId: (raw['default_category_group_id'] as string) ?? null,
    defaultCategoryGroupName: (raw['default_category_group_name'] as string) ?? null,
    selectedBrowser: (raw['selected_browser'] as WishlistConfig['selectedBrowser']) ?? null,
    selectedFolderIds: (raw['selected_folder_ids'] as string[]) ?? [],
    selectedFolderNames: (raw['selected_folder_names'] as string[]) ?? [],
    autoArchiveOnBookmarkDelete: Boolean(raw['auto_archive_on_bookmark_delete']),
    autoArchiveOnGoalMet: Boolean(raw['auto_archive_on_goal_met']),
  };
}

/**
 * Wishlist config query - fetches configuration settings
 */
export function useWishlistConfigQuery(options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.wishlistConfig, isDemo),
    queryFn: async (): Promise<WishlistConfig> => {
      const raw = isDemo ? await demoApi.getWishlistConfig() : await api.getWishlistConfig();
      return transformWishlistConfig(raw as unknown as Record<string, unknown>);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * Update wishlist config mutation
 */
export function useUpdateWishlistConfigMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<WishlistConfig>) =>
      isDemo ? demoApi.updateWishlistConfig(updates) : api.updateWishlistConfig(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.wishlistConfig, isDemo) });
    },
  });
}

/**
 * Helper: Check if wishlist is configured
 */
export function useIsWishlistConfigured(): boolean {
  const { data } = useWishlistConfigQuery();
  return data?.isConfigured ?? false;
}

/**
 * Wishlist category groups query - fetches groups for dropdown selections
 */
export function useWishlistCategoryGroupsQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.wishlistCategoryGroups, isDemo),
    queryFn: async () => {
      return isDemo
        ? await demoApi.getWishlistCategoryGroups()
        : await api.getWishlistCategoryGroups();
    },
    staleTime: 5 * 60 * 1000,
  });
}
