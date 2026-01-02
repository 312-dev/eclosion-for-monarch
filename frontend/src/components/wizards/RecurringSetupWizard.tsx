/**
 * Recurring Setup Wizard
 *
 * Per-tool setup wizard for the Recurring Expenses feature.
 * Shown within the RecurringTab when the feature is not yet configured.
 *
 * Steps:
 * 1. Category Group Selection - Choose where to create budget categories
 * 2. Item Selection - Select recurring items to track (with category linking)
 * 3. Rollup Explanation - Explain the rollup concept
 */

import { useState, useEffect, useCallback } from 'react';
import { TourProvider } from '@reactour/tour';
import type { CategoryGroup, RecurringItem, UnmappedCategory } from '../../types';
import { getErrorMessage } from '../../utils';
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
} from '../../api/client';
import { LinkCategoryModal, type PendingLink } from '../LinkCategoryModal';
import {
  StepIndicator,
  WizardNavigation,
  wizardTourStyles,
  TourController,
} from './WizardComponents';
import { CategoryStep, ItemSelectionStep, RollupConfigStep } from './steps';
import { UI } from '../../constants';

interface RecurringSetupWizardProps {
  onComplete: () => void;
}

// Steps for this wizard
const STEPS = [
  { id: 'category', title: 'Category' },
  { id: 'items', title: 'Items' },
  { id: 'rollup', title: 'Rollup' },
];

// Tour steps for the link icon
const TOUR_STEPS = [
  {
    selector: '[data-tour="link-icon"]',
    content: () => (
      <div>
        <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--monarch-text-dark)' }}>
          Link to Existing Category
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', marginBottom: '12px' }}>
          Already have a category in Monarch for this expense? Click this icon to link to it instead of creating a new one.
        </p>
        <p style={{ fontSize: '13px', color: 'var(--monarch-text-muted)', fontStyle: 'italic' }}>
          This helps keep your existing budget organization intact.
        </p>
      </div>
    ),
    position: 'left' as const,
  },
];

export function RecurringSetupWizard({ onComplete }: RecurringSetupWizardProps) {
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

  // Load groups when entering category step
  useEffect(() => {
    if (currentStep === 0 && !groupsFetched && !loadingGroups && !groupError) {
      fetchGroups();
    }
  }, [currentStep, groupsFetched, loadingGroups, groupError]);

  // Load items when entering items step
  useEffect(() => {
    if (currentStep === 1 && !itemsFetched && !loadingItems && !itemsError) {
      fetchItems();
    }
  }, [currentStep, itemsFetched, loadingItems, itemsError]);

  // Fetch rollup categories when entering rollup step
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

  // Load rollup categories when entering rollup step
  useEffect(() => {
    if (currentStep === 2 && rollupCategories.length === 0 && !loadingRollupCategories) {
      fetchRollupCategories();
    }
  }, [currentStep, rollupCategories.length, loadingRollupCategories]);

  // Check if can proceed
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!selectedGroupId;
      case 1:
        return true; // Item selection is optional
      case 2:
        // Rollup config - if existing mode, must select a category
        return rollupMode === 'new' || !!selectedRollupCategoryId;
      default:
        return false;
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

        // Show link tour on first item selection
        if (wasEmpty && !linkTourShown) {
          setTimeout(() => {
            setShowLinkTour(true);
            setLinkTourShown(true);
          }, UI.ANIMATION.NORMAL);
        }

        // Show rollup tip for small items
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
        if (select) {
          next.add(id);
        } else {
          next.delete(id);
        }
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
      // Save the category group config
      if (selectedGroupId && selectedGroupName) {
        await setConfig(selectedGroupId, selectedGroupName);
      }

      // Set up rollup category based on user choice
      if (rollupMode === 'existing' && selectedRollupCategoryId) {
        // Link to existing category - inherits its budget
        await linkRollupToCategory(selectedRollupCategoryId, rollupSyncName);
      } else {
        // Create new rollup category with $0 budget
        await createRollupCategory(0);
      }

      // Save pending category links
      const linkPromises = Array.from(pendingLinks.entries()).map(([itemId, link]) =>
        linkToCategory(itemId, link.categoryId, link.syncName).catch((err) => ({
          itemId,
          error: err instanceof Error ? err.message : 'Failed to link',
        }))
      );

      await Promise.all(linkPromises);

      // Enable selected items (that aren't linked)
      // Use $0 initial budget for newly created categories
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

      // Complete the wizard
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
    if (currentStep === STEPS.length - 1) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  // Handle back
  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  // Render current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <CategoryStep
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={handleSelectGroup}
            loading={loadingGroups}
            onRefresh={fetchGroups}
            error={groupError}
          />
        );
      case 1:
        return (
          <ItemSelectionStep
            items={items}
            selectedIds={selectedItemIds}
            pendingLinks={pendingLinks}
            onToggleItem={handleToggleItem}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onRefresh={handleRefreshItems}
            loading={loadingItems}
            error={itemsError}
            onToggleGroup={handleToggleGroup}
            onLinkClick={handleOpenLinkModal}
            onUnlink={handleUnlink}
            categoryGroupName={selectedGroupName}
            onChangeGroup={handleChangeGroup}
          />
        );
      case 2:
        return (
          <RollupConfigStep
            mode={rollupMode}
            onModeChange={setRollupMode}
            categories={rollupCategories}
            selectedCategoryId={selectedRollupCategoryId}
            onCategorySelect={setSelectedRollupCategoryId}
            syncName={rollupSyncName}
            onSyncNameChange={setRollupSyncName}
            loading={loadingRollupCategories}
            groupName={selectedGroupName}
          />
        );
      default:
        return null;
    }
  };

  return (
    <TourProvider
      steps={TOUR_STEPS}
      styles={wizardTourStyles}
      showNavigation={false}
      showBadge={false}
      disableInteraction
      onClickMask={() => setShowLinkTour(false)}
      onClickClose={() => setShowLinkTour(false)}
      scrollSmooth
    >
      <TourController isOpen={showLinkTour} onClose={() => setShowLinkTour(false)} />
      <div className="flex items-center justify-center p-4">
        <div
          className="rounded-xl shadow-lg w-full max-w-lg p-6"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <StepIndicator steps={STEPS} currentStep={currentStep} />

          {saveError && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
            >
              {saveError}
            </div>
          )}

          {renderStepContent()}

          <WizardNavigation
            onBack={handleBack}
            onNext={handleNext}
            onSkip={handleSkip}
            canGoBack={currentStep > 0}
            canProceed={canProceed()}
            isLastStep={currentStep === STEPS.length - 1}
            isSaving={saving}
            nextLabel={currentStep === STEPS.length - 1 ? 'Finish Setup' : undefined}
          />
        </div>

        {/* Link Category Modal */}
        {linkModalItem && (
          <LinkCategoryModal
            item={linkModalItem}
            isOpen={!!linkModalItem}
            onClose={() => setLinkModalItem(null)}
            onSuccess={handleLinkSuccess}
            deferSave={true}
            reservedCategories={new Map(
              Array.from(pendingLinks.entries()).map(([itemId, link]) => {
                const linkedItem = items.find(i => i.id === itemId);
                const itemName = linkedItem?.merchant_name || linkedItem?.name || 'Unknown item';
                return [link.categoryId, itemName];
              })
            )}
          />
        )}

        {/* Rollup tip modal */}
        {showRollupTip && (
          <>
            <div
              className="fixed inset-0 z-(--z-index-modal-backdrop)"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            />
            <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center p-4">
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: 'var(--monarch-bg-card)',
                  border: '1px solid var(--monarch-border)',
                  maxWidth: '340px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                }}
              >
                <div className="font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
                  Here's a tip!
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
                  Smaller recurring items can be left unchecked here and combined into a shared rollup category in the next step.
                </p>
                <button
                  onClick={() => setShowRollupTip(false)}
                  className="w-full py-2 px-4 rounded-lg text-sm font-medium hover-bg-orange-to-orange-hover"
                  style={{ color: 'white' }}
                >
                  Got it
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </TourProvider>
  );
}
