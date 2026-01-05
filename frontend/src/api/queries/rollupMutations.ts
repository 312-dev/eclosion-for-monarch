/**
 * Rollup Mutations
 *
 * Mutations for rollup category operations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';

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
