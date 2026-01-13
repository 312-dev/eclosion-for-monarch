/**
 * Config Store Queries
 *
 * Selectors for accessing configuration data.
 *
 * NOTE: Config is currently embedded in the dashboard response.
 * These selectors provide a consistent interface that can be updated
 * to use a dedicated /api/config endpoint when available.
 *
 * Future improvement: Create a separate /api/config backend endpoint
 * to avoid cascading invalidations when settings are updated.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import { useDashboardQuery } from './dashboardQueries';
import { queryKeys, getQueryKey } from './keys';
import type { DashboardConfig, DashboardData } from '../../types/dashboard';

// ============================================================================
// Selectors (derived from dashboard query)
// ============================================================================

/**
 * Get the full config object
 *
 * Use this when you need multiple config values.
 */
export function useConfig(): {
  config: DashboardConfig | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useDashboardQuery();
  return {
    config: data?.config,
    isLoading,
    error,
  };
}

/**
 * Check if recurring expense tracking is configured
 */
export function useIsConfigured(): boolean {
  const { data } = useDashboardQuery();
  return data?.config.is_configured ?? false;
}

/**
 * Get the target category group for recurring expenses
 */
export function useTargetGroup(): {
  id: string | null;
  name: string | null;
} {
  const { data } = useDashboardQuery();
  return {
    id: data?.config.target_group_id ?? null,
    name: data?.config.target_group_name ?? null,
  };
}

/**
 * Get auto-sync settings
 */
export function useAutoSyncSettings(): {
  autoSyncNew: boolean;
  autoTrackThreshold: number | null;
  autoUpdateTargets: boolean;
  autoCategorizeEnabled: boolean;
} {
  const { data } = useDashboardQuery();
  return {
    autoSyncNew: data?.config.auto_sync_new ?? false,
    autoTrackThreshold: data?.config.auto_track_threshold ?? null,
    autoUpdateTargets: data?.config.auto_update_targets ?? false,
    autoCategorizeEnabled: data?.config.auto_categorize_enabled ?? false,
  };
}

/**
 * Get display preferences
 */
export function useDisplayPreferences(): {
  showCategoryGroup: boolean;
} {
  const { data } = useDashboardQuery();
  return {
    showCategoryGroup: data?.config.show_category_group ?? true,
  };
}

/**
 * Get user info from config
 */
export function useUserInfo(): {
  firstName: string | null;
} {
  const { data } = useDashboardQuery();
  return {
    firstName: data?.config.user_first_name ?? null,
  };
}

// ============================================================================
// Cache Utilities
// ============================================================================

/**
 * Get config from cache without triggering a fetch
 *
 * Useful for imperative code that needs to check config state.
 */
export function useGetConfigFromCache() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback((): DashboardConfig | undefined => {
    const dashboard = queryClient.getQueryData<DashboardData>(
      getQueryKey(queryKeys.dashboard, isDemo)
    );
    return dashboard?.config;
  }, [queryClient, isDemo]);
}

/**
 * Optimistically update config in cache
 *
 * Use this for immediate UI feedback before API confirmation.
 * Returns a rollback function to restore previous state on error.
 */
export function useUpdateConfigInCache() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(
    (updates: Partial<DashboardConfig>): (() => void) => {
      const queryKey = getQueryKey(queryKeys.dashboard, isDemo);
      const previous = queryClient.getQueryData<DashboardData>(queryKey);

      if (previous) {
        queryClient.setQueryData<DashboardData>(queryKey, {
          ...previous,
          config: { ...previous.config, ...updates },
        });
      }

      // Return rollback function
      return () => {
        if (previous) {
          queryClient.setQueryData<DashboardData>(queryKey, previous);
        }
      };
    },
    [queryClient, isDemo]
  );
}
