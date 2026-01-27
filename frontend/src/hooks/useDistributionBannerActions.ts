/**
 * Distribution Banner Actions Hook
 *
 * Extracts the action handlers and state for the distribution mode banner
 * to keep the component under the 300 line limit.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDistributionMode } from '../context/DistributionModeContext';
import { useToast } from '../context/ToastContext';
import {
  useStashQuery,
  useUpdateCategoryRolloverMutation,
  useUpdateGroupRolloverMutation,
  useSaveHypothesisMutation,
} from '../api/queries/stashQueries';
import type { SaveHypothesisRequest } from '../types';

export function useDistributionBannerActions() {
  const {
    mode,
    stashedAllocations,
    monthlyAllocations,
    customAvailableFunds,
    customLeftToBudget,
    timelineEvents,
    itemApys,
    totalStashedAllocated,
    totalMonthlyAllocated,
    hasChanges,
    exitMode,
    setScenarioSidebarOpen,
    loadedScenarioId,
    loadedScenarioName,
    submitRequestId,
  } = useDistributionMode();

  const toast = useToast();
  const { data: stashData } = useStashQuery();
  const updateCategoryRollover = useUpdateCategoryRolloverMutation();
  const updateGroupRollover = useUpdateGroupRolloverMutation();
  const saveMutation = useSaveHypothesisMutation();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSaveNameDialog, setShowSaveNameDialog] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastSubmitRequestId = useRef(0);

  const handleDismiss = useCallback(() => {
    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      exitMode();
    }
  }, [hasChanges, exitMode]);

  const handleApply = useCallback(async () => {
    if (!stashData?.items) {
      toast.error('Stash data not available');
      return;
    }

    const itemsById = new Map(stashData.items.map((item) => [item.id, item]));
    const updates: Array<{
      itemId: string;
      categoryId: string | null;
      groupId: string | null;
      isFlexibleGroup: boolean;
      delta: number;
    }> = [];

    for (const [itemId, newBalance] of Object.entries(stashedAllocations)) {
      const item = itemsById.get(itemId);
      if (!item) continue;

      const delta = newBalance - item.current_balance;
      if (delta === 0) continue;

      updates.push({
        itemId,
        categoryId: item.category_id,
        groupId: item.category_group_id,
        isFlexibleGroup: item.is_flexible_group ?? false,
        delta,
      });
    }

    if (updates.length === 0) {
      toast.info('No balance changes to apply');
      exitMode();
      return;
    }

    setIsApplying(true);
    try {
      const promises = updates.map((update) => {
        if (update.isFlexibleGroup && update.groupId) {
          return updateGroupRollover.mutateAsync({
            groupId: update.groupId,
            amount: update.delta,
          });
        } else if (update.categoryId) {
          return updateCategoryRollover.mutateAsync({
            categoryId: update.categoryId,
            amount: update.delta,
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      toast.success(`Updated ${updates.length} stash item${updates.length === 1 ? '' : 's'}`);
      exitMode();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply allocations';
      toast.error(message);
    } finally {
      setIsApplying(false);
    }
  }, [stashedAllocations, stashData, updateCategoryRollover, updateGroupRollover, exitMode, toast]);

  const handleOpenScenarios = useCallback(() => {
    setScenarioSidebarOpen(true);
  }, [setScenarioSidebarOpen]);

  const buildSaveRequest = useCallback(
    (name: string): SaveHypothesisRequest => {
      const eventsMap: Record<
        string,
        Array<{ id: string; type: '1x' | 'mo'; month: string; amount: number }>
      > = {};
      for (const event of timelineEvents) {
        const arr = (eventsMap[event.itemId] ??= []);
        arr.push({
          id: event.id,
          type: event.type === 'deposit' ? '1x' : 'mo',
          month: event.date.slice(0, 7),
          amount: event.amount,
        });
      }

      return {
        name,
        savingsAllocations: stashedAllocations,
        savingsTotal: totalStashedAllocated,
        monthlyAllocations,
        monthlyTotal: totalMonthlyAllocated,
        events: eventsMap,
        customAvailableFunds,
        customLeftToBudget,
        itemApys,
      };
    },
    [
      stashedAllocations,
      totalStashedAllocated,
      monthlyAllocations,
      totalMonthlyAllocated,
      timelineEvents,
      customAvailableFunds,
      customLeftToBudget,
      itemApys,
    ]
  );

  const handleSave = useCallback(() => {
    if (loadedScenarioId && loadedScenarioName) {
      setIsSaving(true);
      const request = buildSaveRequest(loadedScenarioName);
      saveMutation.mutate(request, {
        onSuccess: () => toast.success(`Saved "${loadedScenarioName}"`),
        onError: () => toast.error('Failed to save scenario'),
        onSettled: () => setIsSaving(false),
      });
    } else {
      setShowSaveNameDialog(true);
    }
  }, [loadedScenarioId, loadedScenarioName, buildSaveRequest, saveMutation, toast]);

  const handleSaveWithName = useCallback(
    (name: string) => {
      setIsSaving(true);
      const request = buildSaveRequest(name);
      saveMutation.mutate(request, {
        onSuccess: () => {
          toast.success(`Saved "${name}"`);
          setShowSaveNameDialog(false);
        },
        onError: () => toast.error('Failed to save scenario'),
        onSettled: () => setIsSaving(false),
      });
    },
    [buildSaveRequest, saveMutation, toast]
  );

  const handleCancelSave = useCallback(() => setShowSaveNameDialog(false), []);

  useEffect(() => {
    if (submitRequestId > lastSubmitRequestId.current) {
      lastSubmitRequestId.current = submitRequestId;
      if (mode === 'distribute') {
        handleApply();
      } else if (mode === 'hypothesize') {
        handleSave();
      }
    }
  }, [submitRequestId, mode, handleApply, handleSave]);

  const handleConfirmExit = useCallback(() => {
    setShowConfirmDialog(false);
    exitMode(true);
  }, [exitMode]);

  const handleCancelExit = useCallback(() => setShowConfirmDialog(false), []);

  return {
    mode,
    loadedScenarioName,
    hasChanges,
    isApplying,
    isSaving,
    showConfirmDialog,
    showSaveNameDialog,
    handleDismiss,
    handleApply,
    handleOpenScenarios,
    handleSave,
    handleSaveWithName,
    handleCancelSave,
    handleConfirmExit,
    handleCancelExit,
  };
}
