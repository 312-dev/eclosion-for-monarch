/**
 * useRecurringSetupWizard Hook
 *
 * Manages state and handlers for the recurring tool setup wizard.
 */

import { useState, useEffect } from 'react';
import { getErrorMessage } from '../utils';
import {
  setConfig,
  toggleItemTracking,
  linkToCategory,
  linkRollupToCategory,
  createRollupCategory,
  updateSettings,
} from '../api/client';
import { useCategoryGroups, useItemSelection, useRollupConfig } from './wizard';

interface UseRecurringSetupWizardOptions {
  onComplete: () => void;
}

export function useRecurringSetupWizard({ onComplete }: UseRecurringSetupWizardOptions) {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autoCategorizeEnabled, setAutoCategorizeEnabled] = useState(false);

  const categoryGroups = useCategoryGroups();
  const itemSelection = useItemSelection();
  const rollupConfig = useRollupConfig();

  // Load groups when entering category step (step 0)
  const { groupsFetched, loadingGroups, groupError, fetchGroups } = categoryGroups;
  useEffect(() => {
    if (currentStep === 0 && !groupsFetched && !loadingGroups && !groupError) {
      fetchGroups();
    }
  }, [currentStep, groupsFetched, loadingGroups, groupError, fetchGroups]);

  // Load items when entering items step (step 1)
  const { itemsFetched, loadingItems, itemsError, fetchItems } = itemSelection;
  useEffect(() => {
    if (currentStep === 1 && !itemsFetched && !loadingItems && !itemsError) {
      fetchItems();
    }
  }, [currentStep, itemsFetched, loadingItems, itemsError, fetchItems]);

  // Load rollup categories when entering rollup step (step 2)
  const { rollupCategories, loadingRollupCategories, fetchRollupCategories } = rollupConfig;
  useEffect(() => {
    if (currentStep === 2 && rollupCategories.length === 0 && !loadingRollupCategories) {
      fetchRollupCategories();
    }
  }, [currentStep, rollupCategories.length, loadingRollupCategories, fetchRollupCategories]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return !!categoryGroups.selectedGroupId;
      case 1: return true;
      case 2: return rollupConfig.rollupMode === 'new' || !!rollupConfig.selectedRollupCategoryId;
      default: return false;
    }
  };

  const handleChangeGroup = () => {
    setCurrentStep(0);
  };

  const handleComplete = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      if (categoryGroups.selectedGroupId && categoryGroups.selectedGroupName) {
        await setConfig(categoryGroups.selectedGroupId, categoryGroups.selectedGroupName);
      }

      if (rollupConfig.rollupMode === 'existing' && rollupConfig.selectedRollupCategoryId) {
        await linkRollupToCategory(rollupConfig.selectedRollupCategoryId, rollupConfig.rollupSyncName);
      } else {
        await createRollupCategory(0);
      }

      const linkPromises = Array.from(itemSelection.pendingLinks.entries()).map(([itemId, link]) =>
        linkToCategory(itemId, link.categoryId, link.syncName).catch((err) => ({
          itemId,
          error: err instanceof Error ? err.message : 'Failed to link',
        }))
      );

      await Promise.all(linkPromises);

      const linkedItemIds = new Set(itemSelection.pendingLinks.keys());
      const enablePromises = Array.from(itemSelection.selectedItemIds)
        .filter((id) => !linkedItemIds.has(id))
        .map((id) =>
          toggleItemTracking(id, true, { initialBudget: 0 }).catch((err) => ({
            id,
            error: err instanceof Error ? err.message : 'Failed',
          }))
        );

      await Promise.all(enablePromises);

      // Save auto-categorize setting if enabled
      if (autoCategorizeEnabled) {
        await updateSettings({ auto_categorize_enabled: true });
      }

      onComplete();
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      if (categoryGroups.selectedGroupId && categoryGroups.selectedGroupName) {
        await setConfig(categoryGroups.selectedGroupId, categoryGroups.selectedGroupName);
      }
      onComplete();
    } catch {
      onComplete();
    }
  };

  const handleNext = () => {
    if (currentStep === 2) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  return {
    // Step
    currentStep,
    canProceed,
    handleNext,
    handleBack,

    // Groups
    groups: categoryGroups.groups,
    selectedGroupId: categoryGroups.selectedGroupId,
    selectedGroupName: categoryGroups.selectedGroupName,
    loadingGroups: categoryGroups.loadingGroups,
    groupError: categoryGroups.groupError,
    handleSelectGroup: categoryGroups.handleSelectGroup,
    fetchGroups: categoryGroups.fetchGroups,

    // Items
    items: itemSelection.items,
    selectedItemIds: itemSelection.selectedItemIds,
    loadingItems: itemSelection.loadingItems,
    itemsError: itemSelection.itemsError,
    pendingLinks: itemSelection.pendingLinks,
    handleToggleItem: itemSelection.handleToggleItem,
    handleSelectAll: itemSelection.handleSelectAll,
    handleDeselectAll: itemSelection.handleDeselectAll,
    handleToggleGroup: itemSelection.handleToggleGroup,
    handleRefreshItems: itemSelection.handleRefreshItems,
    handleOpenLinkModal: itemSelection.handleOpenLinkModal,
    handleLinkSuccess: itemSelection.handleLinkSuccess,
    handleUnlink: itemSelection.handleUnlink,
    handleChangeGroup,

    // Link modal
    linkModalItem: itemSelection.linkModalItem,
    setLinkModalItem: itemSelection.setLinkModalItem,

    // Tour
    showLinkTour: itemSelection.showLinkTour,
    setShowLinkTour: itemSelection.setShowLinkTour,

    // Rollup tip
    showRollupTip: itemSelection.showRollupTip,
    setShowRollupTip: itemSelection.setShowRollupTip,

    // Rollup config
    rollupMode: rollupConfig.rollupMode,
    setRollupMode: rollupConfig.setRollupMode,
    rollupCategories: rollupConfig.rollupCategories,
    selectedRollupCategoryId: rollupConfig.selectedRollupCategoryId,
    setSelectedRollupCategoryId: rollupConfig.setSelectedRollupCategoryId,
    rollupSyncName: rollupConfig.rollupSyncName,
    setRollupSyncName: rollupConfig.setRollupSyncName,
    loadingRollupCategories: rollupConfig.loadingRollupCategories,

    // Auto-categorize
    autoCategorizeEnabled,
    setAutoCategorizeEnabled,

    // Saving
    saving,
    saveError,
    handleSkip,
  };
}
