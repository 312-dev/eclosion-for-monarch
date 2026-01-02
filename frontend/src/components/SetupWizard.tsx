/**
 * SetupWizard - Main setup wizard for first-time configuration
 *
 * Guides users through initial setup including category group selection,
 * recurring item selection, and rollup configuration.
 */

import { useState, useEffect, useCallback } from 'react';
import { TourProvider } from '@reactour/tour';
import type { CategoryGroup, RecurringItem, UnmappedCategory } from '../types';
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
import { usePwaInstall } from '../hooks/usePwaInstall';
import { LinkCategoryModal, type PendingLink } from './LinkCategoryModal';
import { TourController, wizardTourStyles } from './wizards/WizardComponents';
import { StepIndicator, SETUP_WIZARD_STEPS } from './wizards/StepIndicator';
import { WizardNavigation } from './wizards/WizardNavigation';
import {
  WelcomeStep,
  CategoryStep,
  ItemSelectionStep,
  RollupConfigStep,
  FinishStep,
} from './wizards/steps';

interface SetupWizardProps {
  onComplete: () => void;
}

// Tour steps for guided experience
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

export function SetupWizard({ onComplete }: SetupWizardProps) {
  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // PWA install state
  const pwaInstall = usePwaInstall();

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

  // Rollup tip toast state
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
      setGroupError(err instanceof Error ? err.message : 'Failed to load groups');
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
      setItemsError(err instanceof Error ? err.message : 'Failed to load items');
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
    } catch (err) {
      console.error('Failed to fetch rollup categories:', err);
    } finally {
      setLoadingRollupCategories(false);
    }
  };

  // Load groups when entering category step
  useEffect(() => {
    if (currentStep === 1 && !groupsFetched && !loadingGroups && !groupError) {
      fetchGroups();
    }
  }, [currentStep, groupsFetched, loadingGroups, groupError]);

  // Load items when entering items step
  useEffect(() => {
    if (currentStep === 2 && !itemsFetched && !loadingItems && !itemsError) {
      fetchItems();
    }
  }, [currentStep, itemsFetched, loadingItems, itemsError]);

  // Load rollup categories when entering rollup step
  useEffect(() => {
    if (currentStep === 3 && rollupCategories.length === 0 && !loadingRollupCategories) {
      fetchRollupCategories();
    }
  }, [currentStep, rollupCategories.length, loadingRollupCategories]);

  // Check if can proceed to next step
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return true;
      case 1: return !!selectedGroupId;
      case 2: return true;
      case 3: return rollupMode === 'new' || !!selectedRollupCategoryId;
      case 4: return true;
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
          }, 300);
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
      setItemsError(err instanceof Error ? err.message : 'Failed to refresh items');
    } finally {
      setLoadingItems(false);
    }
  };

  // Handle opening link modal
  const handleOpenLinkModal = (item: RecurringItem) => {
    setLinkModalItem(item);
  };

  // Handle link result from modal
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

  // Handle unlinking an item
  const handleUnlink = (itemId: string) => {
    setPendingLinks((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  };

  // Handle going back to category step
  const handleChangeGroup = () => {
    setCurrentStep(1);
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
      setSaveError(err instanceof Error ? err.message : 'Failed to save configuration');
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
    if (currentStep === SETUP_WIZARD_STEPS.length - 1) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  // Handle back
  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  // Handle PWA install
  const handleInstall = async () => {
    await pwaInstall.promptInstall();
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep />;
      case 1:
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
      case 2:
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
      case 3:
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
      case 4:
        return (
          <FinishStep
            canInstall={pwaInstall.canInstall}
            isInstalled={pwaInstall.isInstalled}
            isIOS={pwaInstall.isIOS}
            onInstall={handleInstall}
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
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--monarch-bg-page)' }}
      >
        <div
          className="rounded-xl shadow-lg w-full max-w-lg p-6"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <StepIndicator steps={SETUP_WIZARD_STEPS} currentStep={currentStep} />

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
            isLastStep={currentStep === SETUP_WIZARD_STEPS.length - 1}
            isSaving={saving}
          />
        </div>

        {/* Bottom right: Help and GitHub links */}
        <div className="fixed bottom-4 right-4 flex items-center gap-2">
          {currentStep === 2 && selectedItemIds.size > 0 && (
            <button
              onClick={() => setShowLinkTour(true)}
              className="p-2 rounded-full transition-colors"
              style={{ color: 'var(--monarch-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--monarch-text-dark)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--monarch-text-muted)'; }}
              title="Show tutorial"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
          )}

          <a
            href="https://github.com/graysonhead/eclosion"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full transition-colors"
            style={{ color: 'var(--monarch-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--monarch-text-dark)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--monarch-text-muted)'; }}
            title="View source on GitHub"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
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
              className="fixed inset-0 z-modal-backdrop"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            />
            <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
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
                  className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--monarch-orange)',
                    color: 'white',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--monarch-orange-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--monarch-orange)'; }}
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
