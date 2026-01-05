/**
 * Dashboard Queries
 *
 * Queries for dashboard data, category groups, and sync mutation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';

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
 * Helper: Invalidate all dashboard-related data
 */
export function useInvalidateDashboard() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
  };
}
