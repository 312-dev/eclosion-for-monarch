/**
 * useRecurringItemActions - Hook for recurring item action handlers
 */

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RecurringItem } from '../types';
import { useToast } from '../context/ToastContext';
import { useDemo } from '../context/DemoContext';
import { useApiClient } from './useApiClient';
import { formatCurrency, handleApiError } from '../utils';
import { UI } from '../constants';
import { queryKeys, getQueryKey } from '../api/queries/keys';

export function useRecurringItemActions(onRefresh: () => void) {
  const toast = useToast();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const isDemo = useDemo();
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [linkModalItem, setLinkModalItem] = useState<RecurringItem | null>(null);

  const handleToggleItem = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await client.toggleItemTracking(id, enabled);
        setHighlightId(id);
        onRefresh();
        toast.success(enabled ? 'Tracking enabled' : 'Tracking disabled');
        setTimeout(() => setHighlightId(null), UI.HIGHLIGHT.ROW);
      } catch (err) {
        toast.error(handleApiError(err, 'Failed to toggle tracking'));
      }
    },
    [client, onRefresh, toast]
  );

  const handleAllocateItem = useCallback(
    async (id: string, diff: number, newAmount: number) => {
      const queryKey = getQueryKey(queryKeys.dashboard, isDemo);

      // Optimistic update: immediately update the cache before API call
      queryClient.setQueryData(
        queryKey,
        (
          old:
            | {
                items?: Array<{
                  id: string;
                  planned_budget: number;
                  current_balance: number;
                  contributed_this_month: number;
                }>;
              }
            | undefined
        ) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === id
                ? {
                    ...item,
                    planned_budget: newAmount,
                    current_balance: item.current_balance + diff,
                    contributed_this_month: item.contributed_this_month + diff,
                  }
                : item
            ),
          };
        }
      );

      try {
        await client.allocateFunds(id, diff);
        // Refetch to get server-confirmed data and recalculate derived values
        onRefresh();
        toast.success(`Budget set to ${formatCurrency(newAmount, { maximumFractionDigits: 0 })}`);
      } catch (err) {
        // Rollback optimistic update on error by refetching
        onRefresh();
        toast.error(handleApiError(err, 'Failed to allocate funds'));
      }
    },
    [client, onRefresh, toast, queryClient, isDemo]
  );

  const handleRecreateItem = useCallback(
    async (id: string) => {
      try {
        await client.recreateCategory(id);
        onRefresh();
        toast.success('Category recreated');
      } catch (err) {
        toast.error(handleApiError(err, 'Failed to recreate category'));
      }
    },
    [client, onRefresh, toast]
  );

  const handleChangeGroupItem = useCallback(
    async (id: string, groupId: string, groupName: string) => {
      try {
        await client.changeCategoryGroup(id, groupId, groupName);
        onRefresh();
        toast.success(`Moved to ${groupName}`);
      } catch (err) {
        toast.error(handleApiError(err, 'Failed to change group'));
      }
    },
    [client, onRefresh, toast]
  );

  const handleAddToRollupItem = useCallback(
    async (id: string) => {
      try {
        await client.addToRollup(id);
        onRefresh();
        toast.success('Added to rollup');
      } catch (err) {
        toast.error(handleApiError(err, 'Failed to add to rollup'));
      }
    },
    [client, onRefresh, toast]
  );

  const handleEmojiChangeItem = useCallback(
    async (id: string, emoji: string) => {
      try {
        await client.updateCategoryEmoji(id, emoji);
        onRefresh();
        // Invalidate category store so Notes screen reflects the new emoji
        queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.categoryStore, isDemo) });
        toast.success('Emoji updated');
      } catch (err) {
        toast.error(handleApiError(err, 'Failed to update emoji'));
      }
    },
    [client, onRefresh, queryClient, isDemo, toast]
  );

  const handleRefreshItem = useCallback(
    async (id: string) => {
      try {
        await client.refreshItem(id);
        onRefresh();
        toast.success('Target recalculated');
      } catch (err) {
        toast.error(handleApiError(err, 'Failed to recalculate target'));
      }
    },
    [client, onRefresh, toast]
  );

  const handleNameChangeItem = useCallback(
    async (id: string, name: string) => {
      try {
        await client.updateCategoryName(id, name);
        onRefresh();
        // Invalidate category store so Notes screen reflects the new name
        queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.categoryStore, isDemo) });
        toast.success('Name updated');
      } catch (err) {
        toast.error(handleApiError(err, 'Failed to update name'));
      }
    },
    [client, onRefresh, queryClient, isDemo, toast]
  );

  const handleLinkCategory = useCallback((item: RecurringItem) => {
    setLinkModalItem(item);
  }, []);

  const handleLinkSuccess = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const closeLinkModal = useCallback(() => {
    setLinkModalItem(null);
  }, []);

  return {
    highlightId,
    linkModalItem,
    handleToggleItem,
    handleAllocateItem,
    handleRecreateItem,
    handleChangeGroupItem,
    handleAddToRollupItem,
    handleEmojiChangeItem,
    handleRefreshItem,
    handleNameChangeItem,
    handleLinkCategory,
    handleLinkSuccess,
    closeLinkModal,
  };
}
