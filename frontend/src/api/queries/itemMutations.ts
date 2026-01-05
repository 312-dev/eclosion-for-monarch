/**
 * Item Mutations
 *
 * Mutations for recurring item operations: toggle, allocate, recreate, refresh, change group.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';

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
