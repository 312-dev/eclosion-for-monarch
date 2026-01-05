/**
 * Uninstall Mutations
 *
 * Mutations for destructive operations: delete categories, cancel subscription.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import { queryKeys, getQueryKey } from './keys';

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
