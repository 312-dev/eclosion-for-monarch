/**
 * Category Mutations
 *
 * Mutations for category operations: emoji, name, and linking.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';

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
