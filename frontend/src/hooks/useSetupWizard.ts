/**
 * useSetupWizard Hook
 *
 * Manages all state and handlers for the setup wizard flow.
 */

import { useState, useEffect } from 'react';
import { getErrorMessage } from '../utils/errors';
import {
  setConfig,
  toggleItemTracking,
  linkToCategory,
  linkRollupToCategory,
  createRollupCategory,
  updateSettings,
} from '../api/client';
import { useCategoryGroups, useItemSelection, useRollupConfig } from './wizard';

interface UseSetupWizardOptions {
  onComplete: () => void;
}

export function useSetupWizard({ onComplete }: UseSetupWizardOptions) {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autoCategorizeEnabled, setAutoCategorizeEnabled] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const categoryGroups = useCategoryGroups();
  const itemSelection = useItemSelection();
  const rollupConfig = useRollupConfig();

  // Load groups when entering category step (step 1)
  const { groupsFetched, loadingGroups, groupError, fetchGroups } = categoryGroups;
  useEffect(() => {
    if (currentStep === 1 && !groupsFetched && !loadingGroups && !groupError) {
      fetchGroups();
    }
  }, [currentStep, groupsFetched, loadingGroups, groupError, fetchGroups]);

  // Load items when entering items step (step 2)
  const { itemsFetched, loadingItems, itemsError, fetchItems } = itemSelection;
  useEffect(() => {
    if (currentStep === 2 && !itemsFetched && !loadingItems && !itemsError) {
      fetchItems();
    }
  }, [currentStep, itemsFetched, loadingItems, itemsError, fetchItems]);

  // Load rollup categories when entering rollup step (step 3)
  const { rollupCategories, loadingRollupCategories, fetchRollupCategories } = rollupConfig;
  useEffect(() => {
    if (currentStep === 3 && rollupCategories.length === 0 && !loadingRollupCategories) {
      fetchRollupCategories();
    }
  }, [currentStep, rollupCategories.length, loadingRollupCategories, fetchRollupCategories]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        return !!categoryGroups.selectedGroupId;
      case 2:
        return true;
      case 3:
        return rollupConfig.rollupMode === 'new' || !!rollupConfig.selectedRollupCategoryId;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleChangeGroup = () => {
    setCurrentStep(1);
  };

  const handleComplete = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      if (categoryGroups.selectedGroupId && categoryGroups.selectedGroupName) {
        await setConfig(categoryGroups.selectedGroupId, categoryGroups.selectedGroupName);
      }

      if (rollupConfig.rollupMode === 'existing' && rollupConfig.selectedRollupCategoryId) {
        await linkRollupToCategory(
          rollupConfig.selectedRollupCategoryId,
          rollupConfig.rollupSyncName
        );
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
          toggleItemTracking(id, true).catch((err) => ({
            id,
            error: err instanceof Error ? err.message : 'Failed',
          }))
        );

      await Promise.all(enablePromises);

      // Save auto-categorize setting
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
    if (currentStep === 4) {
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
    rollupCategoriesFetched: rollupConfig.rollupCategoriesFetched,

    // Auto-categorize
    autoCategorizeEnabled,
    setAutoCategorizeEnabled,

    // Saving
    saving,
    saveError,
    handleSkip,
    handleComplete,

    // Import modal (restore from backup)
    showImportModal,
    setShowImportModal,
    handleRestoreFromBackup: () => setShowImportModal(true),
    handleImportSuccess: onComplete,
  };
}
