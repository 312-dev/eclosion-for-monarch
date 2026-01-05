/**
 * useRecurringSetupWizard Hook
 *
 * Manages state and handlers for the recurring tool setup wizard.
 */

import { useState, useEffect, useCallback } from 'react';
import type { CategoryGroup, RecurringItem, UnmappedCategory } from '../types';
import { getErrorMessage } from '../utils';
import {
  getCategoryGroups,
  setConfig,
  getDashboard,
  toggleItemTracking,
  triggerSync,
  linkToCategory,
  getUnmappedCategories,
  linkRollupToCategory,
  createRollupCategory,
} from '../api/client';
import type { PendingLink } from '../components/LinkCategoryModal';
import { UI } from '../constants';

interface UseRecurringSetupWizardOptions {
  onComplete: () => void;
}

export function useRecurringSetupWizard({ onComplete }: UseRecurringSetupWizardOptions) {
  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // Category group state
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedGroupName, setSelectedGroupName] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupsFetched, setGroupsFetched] = useState(false);

  // Items state
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [itemsFetched, setItemsFetched] = useState(false);

  // Linking state
  const [pendingLinks, setPendingLinks] = useState<Map<string, PendingLink>>(new Map());
  const [linkModalItem, setLinkModalItem] = useState<RecurringItem | null>(null);

  // Tour state
  const [showLinkTour, setShowLinkTour] = useState(false);
  const [linkTourShown, setLinkTourShown] = useState(false);

  // Rollup tip state
  const [rollupTipShown, setRollupTipShown] = useState(false);
  const [showRollupTip, setShowRollupTip] = useState(false);

  // Rollup configuration state
  const [rollupMode, setRollupMode] = useState<'new' | 'existing'>('new');
  const [rollupCategories, setRollupCategories] = useState<UnmappedCategory[]>([]);
  const [selectedRollupCategoryId, setSelectedRollupCategoryId] = useState('');
  const [rollupSyncName, setRollupSyncName] = useState(true);
  const [loadingRollupCategories, setLoadingRollupCategories] = useState(false);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch category groups
  const fetchGroups = async () => {
    setLoadingGroups(true);
    setGroupError(null);
    try {
      const data = await getCategoryGroups();
      setGroups(data);
      setGroupsFetched(true);
    } catch (err) {
      setGroupError(getErrorMessage(err));
    } finally {
      setLoadingGroups(false);
    }
  };

  // Fetch recurring items
  const fetchItems = async () => {
    setLoadingItems(true);
    setItemsError(null);
    try {
      const data = await getDashboard();
      const availableItems = data.items.filter((item) => !item.is_enabled);
      setItems(availableItems);
      setItemsFetched(true);
    } catch (err) {
      setItemsError(getErrorMessage(err));
    } finally {
      setLoadingItems(false);
    }
  };

  // Fetch rollup categories
  const fetchRollupCategories = async () => {
    setLoadingRollupCategories(true);
    try {
      const categories = await getUnmappedCategories();
      setRollupCategories(categories);
    } catch {
      // Silently fail - the dropdown will show empty state
    } finally {
      setLoadingRollupCategories(false);
    }
  };

  // Load groups when entering category step (step 0)
  useEffect(() => {
    if (currentStep === 0 && !groupsFetched && !loadingGroups && !groupError) {
      fetchGroups();
    }
  }, [currentStep, groupsFetched, loadingGroups, groupError]);

  // Load items when entering items step (step 1)
  useEffect(() => {
    if (currentStep === 1 && !itemsFetched && !loadingItems && !itemsError) {
      fetchItems();
    }
  }, [currentStep, itemsFetched, loadingItems, itemsError]);

  // Load rollup categories when entering rollup step (step 2)
  useEffect(() => {
    if (currentStep === 2 && rollupCategories.length === 0 && !loadingRollupCategories) {
      fetchRollupCategories();
    }
  }, [currentStep, rollupCategories.length, loadingRollupCategories]);

  // Check if can proceed
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return !!selectedGroupId;
      case 1: return true; // Item selection is optional
      case 2: return rollupMode === 'new' || !!selectedRollupCategoryId;
      default: return false;
    }
  };

  // Handle group selection
  const handleSelectGroup = (id: string, name: string) => {
    setSelectedGroupId(id);
    setSelectedGroupName(name);
  };

  // Handle item toggle
  const handleToggleItem = useCallback((id: string) => {
    const item = items.find(i => i.id === id);

    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      const wasEmpty = prev.size === 0;

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);

        if (wasEmpty && !linkTourShown) {
          setTimeout(() => {
            setShowLinkTour(true);
            setLinkTourShown(true);
          }, UI.ANIMATION.NORMAL);
        }

        if (item && item.amount < 60 && !rollupTipShown) {
          setRollupTipShown(true);
          setShowRollupTip(true);
        }
      }
      return next;
    });
  }, [items, linkTourShown, rollupTipShown]);

  // Handle select all
  const handleSelectAll = () => {
    setSelectedItemIds(new Set(items.map((item) => item.id)));
    if (!rollupTipShown && items.some(item => item.amount < 60)) {
      setRollupTipShown(true);
      setShowRollupTip(true);
    }
  };

  // Handle deselect all
  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  // Handle toggle group
  const handleToggleGroup = (ids: string[], select: boolean) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (select) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  // Handle refresh items
  const handleRefreshItems = async () => {
    setLoadingItems(true);
    setItemsError(null);
    setItemsFetched(false);
    try {
      await triggerSync();
      const data = await getDashboard();
      const availableItems = data.items.filter((item) => !item.is_enabled);
      setItems(availableItems);
      setItemsFetched(true);
    } catch (err) {
      setItemsError(getErrorMessage(err));
    } finally {
      setLoadingItems(false);
    }
  };

  // Handle link modal
  const handleOpenLinkModal = (item: RecurringItem) => {
    setLinkModalItem(item);
  };

  const handleLinkSuccess = (link?: PendingLink) => {
    if (link && linkModalItem) {
      setPendingLinks((prev) => {
        const next = new Map(prev);
        next.set(linkModalItem.id, link);
        return next;
      });
    }
    setLinkModalItem(null);
  };

  const handleUnlink = (itemId: string) => {
    setPendingLinks((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  };

  // Handle going back to category step
  const handleChangeGroup = () => {
    setCurrentStep(0);
  };

  // Handle completion
  const handleComplete = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      if (selectedGroupId && selectedGroupName) {
        await setConfig(selectedGroupId, selectedGroupName);
      }

      if (rollupMode === 'existing' && selectedRollupCategoryId) {
        await linkRollupToCategory(selectedRollupCategoryId, rollupSyncName);
      } else {
        await createRollupCategory(0);
      }

      const linkPromises = Array.from(pendingLinks.entries()).map(([itemId, link]) =>
        linkToCategory(itemId, link.categoryId, link.syncName).catch((err) => ({
          itemId,
          error: err instanceof Error ? err.message : 'Failed to link',
        }))
      );

      await Promise.all(linkPromises);

      const linkedItemIds = new Set(pendingLinks.keys());
      const enablePromises = Array.from(selectedItemIds)
        .filter((id) => !linkedItemIds.has(id))
        .map((id) =>
          toggleItemTracking(id, true, { initialBudget: 0 }).catch((err) => ({
            id,
            error: err instanceof Error ? err.message : 'Failed',
          }))
        );

      await Promise.all(enablePromises);
      onComplete();
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setSaving(false);
    }
  };

  // Handle skip
  const handleSkip = async () => {
    setSaving(true);
    try {
      if (selectedGroupId && selectedGroupName) {
        await setConfig(selectedGroupId, selectedGroupName);
      }
      onComplete();
    } catch {
      onComplete();
    }
  };

  // Handle next
  const handleNext = () => {
    if (currentStep === 2) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  // Handle back
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
    groups,
    selectedGroupId,
    selectedGroupName,
    loadingGroups,
    groupError,
    handleSelectGroup,
    fetchGroups,

    // Items
    items,
    selectedItemIds,
    loadingItems,
    itemsError,
    pendingLinks,
    handleToggleItem,
    handleSelectAll,
    handleDeselectAll,
    handleToggleGroup,
    handleRefreshItems,
    handleOpenLinkModal,
    handleLinkSuccess,
    handleUnlink,
    handleChangeGroup,

    // Link modal
    linkModalItem,
    setLinkModalItem,

    // Tour
    showLinkTour,
    setShowLinkTour,

    // Rollup tip
    showRollupTip,
    setShowRollupTip,

    // Rollup config
    rollupMode,
    setRollupMode,
    rollupCategories,
    selectedRollupCategoryId,
    setSelectedRollupCategoryId,
    rollupSyncName,
    setRollupSyncName,
    loadingRollupCategories,

    // Saving
    saving,
    saveError,
    handleSkip,
  };
}
