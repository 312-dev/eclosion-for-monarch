/**
 * useRecurringItemActions - Hook for recurring item action handlers
 */

import { useCallback, useState } from 'react';
import type { RecurringItem } from '../types';
import { useToast } from '../context/ToastContext';
import { useApiClient } from './useApiClient';
import { formatCurrency, formatErrorMessage } from '../utils';
import { UI } from '../constants';

export function useRecurringItemActions(onRefresh: () => void) {
  const toast = useToast();
  const client = useApiClient();
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [linkModalItem, setLinkModalItem] = useState<RecurringItem | null>(null);

  const handleToggleItem = useCallback(async (id: string, enabled: boolean) => {
    try {
      await client.toggleItemTracking(id, enabled);
      setHighlightId(id);
      onRefresh();
      toast.success(enabled ? 'Tracking enabled' : 'Tracking disabled');
      setTimeout(() => setHighlightId(null), UI.HIGHLIGHT.ROW);
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to toggle tracking'));
    }
  }, [client, onRefresh, toast]);

  const handleAllocateItem = useCallback(async (id: string, amount: number) => {
    try {
      await client.allocateFunds(id, amount);
      onRefresh();
      toast.success(amount > 0 ? `${formatCurrency(amount, { maximumFractionDigits: 0 })} allocated` : `${formatCurrency(Math.abs(amount), { maximumFractionDigits: 0 })} removed`);
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to allocate funds'));
    }
  }, [client, onRefresh, toast]);

  const handleRecreateItem = useCallback(async (id: string) => {
    try {
      await client.recreateCategory(id);
      onRefresh();
      toast.success('Category recreated');
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to recreate category'));
    }
  }, [client, onRefresh, toast]);

  const handleChangeGroupItem = useCallback(async (id: string, groupId: string, groupName: string) => {
    try {
      await client.changeCategoryGroup(id, groupId, groupName);
      onRefresh();
      toast.success(`Moved to ${groupName}`);
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to change group'));
    }
  }, [client, onRefresh, toast]);

  const handleAddToRollupItem = useCallback(async (id: string) => {
    try {
      await client.addToRollup(id);
      onRefresh();
      toast.success('Added to rollup');
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to add to rollup'));
    }
  }, [client, onRefresh, toast]);

  const handleEmojiChangeItem = useCallback(async (id: string, emoji: string) => {
    try {
      await client.updateCategoryEmoji(id, emoji);
      onRefresh();
      toast.success('Emoji updated');
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to update emoji'));
    }
  }, [client, onRefresh, toast]);

  const handleRefreshItem = useCallback(async (id: string) => {
    try {
      await client.refreshItem(id);
      onRefresh();
      toast.success('Target recalculated');
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to recalculate target'));
    }
  }, [client, onRefresh, toast]);

  const handleNameChangeItem = useCallback(async (id: string, name: string) => {
    try {
      await client.updateCategoryName(id, name);
      onRefresh();
      toast.success('Name updated');
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to update name'));
    }
  }, [client, onRefresh, toast]);

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
