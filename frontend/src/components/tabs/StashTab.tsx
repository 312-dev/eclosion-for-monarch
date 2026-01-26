/* eslint-disable max-lines */
/**
 * Stash Tab
 *
 * Displays stash items for savings goals with bookmark sync support.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { ExternalLink, Target } from 'lucide-react';
import { usePageTitle, useBookmarks, useStashSync } from '../../hooks';
import { PageLoadingSpinner } from '../ui/LoadingSpinner';
import {
  NewStashModal,
  EditStashModal,
  StashWidgetGrid,
  PendingReviewSection,
  IgnoredBookmarksSection,
  ArchivedItemsSection,
  BrowserSetupModal,
  StashReportsView,
  decodeHtmlEntities,
  AvailableFundsBar,
  useReportSettings,
  StashVsGoalsModal,
  StashGoalExplainerLink,
  ScenarioSidebarPanel,
  ExitHypothesizeConfirmModal,
  ExitDistributeConfirmModal,
  TimelinePanel,
} from '../stash';
import { useDistributionMode } from '../../context/DistributionModeContext';
import { Icons } from '../icons';
import { StashIcon } from '../wizards/SetupWizardIcons';
import { ToolPageHeader, ToolSettingsModal } from '../ui';
import { EXPAND_PENDING_SECTION_EVENT } from '../layout/stashTourSteps';
import {
  useStashQuery,
  useStashConfigQuery,
  usePendingBookmarksQuery,
  usePendingCountQuery,
  useSkippedBookmarksQuery,
  useSkipPendingMutation,
  useConvertPendingMutation,
  useAllocateStashMutation,
  useUpdateStashLayoutMutation,
  useMonarchGoalsQuery,
  useUpdateMonarchGoalLayoutsMutation,
  useDashboardQuery,
} from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { handleApiError } from '../../utils';
import type {
  StashItem,
  StashLayoutUpdate,
  PendingBookmark,
  MonarchGoal,
  MonarchGoalLayoutUpdate,
} from '../../types';

interface ModalPrefill {
  name?: string;
  sourceUrl?: string;
  sourceBookmarkId?: string;
}

export function StashTab() {
  usePageTitle('Stashes');
  const toast = useToast();

  // Distribution mode state for navigation blocking
  const { mode, hasChanges, exitMode } = useDistributionMode();

  // Block navigation when in hypothesize mode with unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      mode === 'hypothesize' && hasChanges && currentLocation.pathname !== nextLocation.pathname
  );

  // Show exit confirmation modal when navigation is blocked
  const [showNavExitModal, setShowNavExitModal] = useState(false);

  // State for sub-tab switch exit confirmation
  const [pendingViewChange, setPendingViewChange] = useState<'stashes' | 'reports' | null>(null);
  const [showSubTabExitModal, setShowSubTabExitModal] = useState<
    'hypothesize' | 'distribute' | null
  >(null);

  // Tab state (declared early for use in callbacks)
  const [activeView, setActiveView] = useState<'stashes' | 'reports'>('stashes');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Trigger modal when blocker becomes blocked
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowNavExitModal(true);
    }
  }, [blocker.state]);

  // Handle navigation exit confirmation
  const handleNavExitConfirm = useCallback(() => {
    setShowNavExitModal(false);
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker]);

  // Handle navigation exit cancel
  const handleNavExitCancel = useCallback(() => {
    setShowNavExitModal(false);
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  // Handle sub-tab switching with mode exit confirmation
  const handleViewChange = useCallback(
    (newView: 'stashes' | 'reports') => {
      // If switching to the same view, do nothing
      if (newView === activeView) return;

      // If in a mode, check if we need confirmation
      if (mode === null) {
        // Not in any mode, just switch
        setActiveView(newView);
      } else {
        if (hasChanges) {
          // Show appropriate exit confirmation modal
          setPendingViewChange(newView);
          setShowSubTabExitModal(mode);
        } else {
          // No changes, just exit mode and switch
          exitMode();
          setActiveView(newView);
        }
      }
    },
    [activeView, mode, hasChanges, exitMode]
  );

  // Handle sub-tab exit confirmation
  const handleSubTabExitConfirm = useCallback(() => {
    setShowSubTabExitModal(null);
    if (pendingViewChange) {
      setActiveView(pendingViewChange);
      setPendingViewChange(null);
    }
  }, [pendingViewChange]);

  // Handle sub-tab exit cancel
  const handleSubTabExitCancel = useCallback(() => {
    setShowSubTabExitModal(null);
    setPendingViewChange(null);
  }, []);

  // Also warn on browser close/refresh
  useEffect(() => {
    if (mode !== 'hypothesize' || !hasChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [mode, hasChanges]);

  // Queries
  const { data: configData, isLoading: configLoading } = useStashConfigQuery();
  const { data: stashData, isLoading, error } = useStashQuery();
  const { data: monarchGoals = [] } = useMonarchGoalsQuery();
  const { data: pendingBookmarks = [] } = usePendingBookmarksQuery();
  const { data: _pendingCount = 0 } = usePendingCountQuery();
  const { data: skippedBookmarks = [] } = useSkippedBookmarksQuery();

  // Mutations
  const skipPendingMutation = useSkipPendingMutation();
  const convertPendingMutation = useConvertPendingMutation();
  const allocateMutation = useAllocateStashMutation();
  const layoutMutation = useUpdateStashLayoutMutation();
  const goalLayoutMutation = useUpdateMonarchGoalLayoutsMutation();

  // UI state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StashItem | null>(null);
  const [modalPrefill, setModalPrefill] = useState<ModalPrefill | undefined>(undefined);
  const [isPendingExpanded, setIsPendingExpanded] = useState(false);
  const [isIgnoredExpanded, setIsIgnoredExpanded] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedPendingBookmark, setSelectedPendingBookmark] = useState<PendingBookmark | null>(
    null
  );
  const [skippingIds, setSkippingIds] = useState<Set<string>>(new Set());
  const [showBrowserSetupWizard, setShowBrowserSetupWizard] = useState(false);
  const [showExplainerModal, setShowExplainerModal] = useState(false);
  const [allocatingItemId, setAllocatingItemId] = useState<string | null>(null);
  const pendingSectionRef = useRef<HTMLDivElement>(null);

  const isBrowserConfigured =
    !!configData?.selectedBrowser && (configData?.selectedFolderIds?.length ?? 0) > 0;

  // Get Left to Budget (ready_to_assign) from dashboard for distribute button
  const { data: dashboardData } = useDashboardQuery();
  const leftToBudget = dashboardData?.ready_to_assign?.ready_to_assign ?? 0;

  const { isSyncing, syncBookmarks } = useStashSync({
    selectedBrowser: configData?.selectedBrowser ?? null,
    selectedFolderIds: configData?.selectedFolderIds ?? null,
    isBrowserConfigured,
    onShowSetupWizard: () => setShowBrowserSetupWizard(true),
  });
  const { onBookmarkChange } = useBookmarks();

  // Ref to hold latest syncBookmarks for stable interval callback
  const syncBookmarksRef = useRef(syncBookmarks);
  useEffect(() => {
    syncBookmarksRef.current = syncBookmarks;
  }, [syncBookmarks]);

  // Report settings for filtering
  const { setFilteredStashId } = useReportSettings();

  // Currency formatter for timeline
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  // Subscribe to new bookmark additions
  useEffect(() => {
    if (!isBrowserConfigured) return;
    const unsubscribe = onBookmarkChange((change) => {
      if (change.changeType === 'added' && change.bookmark.url) {
        setModalPrefill({
          name: decodeHtmlEntities(change.bookmark.name),
          sourceUrl: decodeHtmlEntities(change.bookmark.url),
          sourceBookmarkId: change.bookmark.id,
        });
        setIsAddModalOpen(true);
        toast.success(`New bookmark detected: ${change.bookmark.name}`);
      }
    });
    return unsubscribe;
  }, [isBrowserConfigured, onBookmarkChange, toast]);

  // Auto-sync bookmarks every minute when configured (silent background sync)
  useEffect(() => {
    if (!isBrowserConfigured) return;

    const intervalId = setInterval(() => {
      syncBookmarksRef.current({ silent: true });
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [isBrowserConfigured]);

  // Listen for tour event
  useEffect(() => {
    const handler = () => setIsPendingExpanded(true);
    globalThis.addEventListener(EXPAND_PENDING_SECTION_EVENT, handler);
    return () => globalThis.removeEventListener(EXPAND_PENDING_SECTION_EVENT, handler);
  }, []);

  const { activeItems, archivedItems } = useMemo(() => {
    if (!stashData) return { activeItems: [], archivedItems: [] };

    const stashItems = stashData.items.filter((item) => !item.is_archived);

    // Merge Monarch goals if setting is enabled
    const showGoals = configData?.showMonarchGoals ?? false;

    // Separate active and completed goals
    const activeGoals = monarchGoals.filter((goal) => !goal.isCompleted);
    const completedGoals = monarchGoals.filter((goal) => goal.isCompleted);

    const allActiveItems: (StashItem | MonarchGoal)[] = showGoals
      ? [...stashItems, ...activeGoals]
      : stashItems;

    const allArchivedItems: (StashItem | MonarchGoal)[] = showGoals
      ? [...stashData.archived_items, ...completedGoals]
      : stashData.archived_items;

    return {
      activeItems: allActiveItems,
      archivedItems: allArchivedItems,
    };
  }, [stashData, monarchGoals, configData?.showMonarchGoals]);

  const handleEdit = useCallback((item: StashItem) => setEditingItem(item), []);

  const handleAllocate = useCallback(
    async (itemId: string, amount: number) => {
      setAllocatingItemId(itemId);
      try {
        await allocateMutation.mutateAsync({ id: itemId, amount });
      } catch (err) {
        toast.error(handleApiError(err, 'Allocating funds'));
      } finally {
        setAllocatingItemId(null);
      }
    },
    [allocateMutation, toast]
  );

  const handleLayoutChange = useCallback(
    (layouts: StashLayoutUpdate[]) => layoutMutation.mutate(layouts),
    [layoutMutation]
  );

  const handleGoalLayoutChange = useCallback(
    (layouts: MonarchGoalLayoutUpdate[]) => goalLayoutMutation.mutate(layouts),
    [goalLayoutMutation]
  );

  const handleSkipPending = useCallback(
    async (id: string) => {
      const item = pendingBookmarks.find((b) => b.id === id);
      setSkippingIds((prev) => new Set(prev).add(id));
      try {
        await skipPendingMutation.mutateAsync(id);
        toast.info(`Skipped "${item?.name ?? 'bookmark'}"`);
      } catch (err) {
        toast.error(handleApiError(err, 'Skipping bookmark'));
      } finally {
        setSkippingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [pendingBookmarks, skipPendingMutation, toast]
  );

  const handleCreateTarget = useCallback((item: PendingBookmark) => {
    setSelectedPendingBookmark(item);
    setModalPrefill({
      name: decodeHtmlEntities(item.name),
      sourceUrl: decodeHtmlEntities(item.url),
      sourceBookmarkId: item.bookmark_id,
    });
    setIsAddModalOpen(true);
  }, []);

  const handlePendingConverted = useCallback(
    async (pendingId: string) => {
      try {
        await convertPendingMutation.mutateAsync(pendingId);
        setSelectedPendingBookmark(null);
      } catch (err) {
        toast.error(handleApiError(err, 'Converting pending bookmark'));
      }
    },
    [convertPendingMutation, toast]
  );

  const handleViewStashReport = useCallback(
    (stashId: string) => {
      setFilteredStashId(stashId);
      setActiveView('reports');
    },
    [setFilteredStashId]
  );

  if (configLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PageLoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-content-enter px-6 pb-6">
        <div
          className="rounded-xl p-8 text-center"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <Icons.AlertCircle
            size={48}
            className="mx-auto mb-4"
            style={{ color: 'var(--monarch-warning)' }}
          />
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
            Error Loading Stashes
          </h2>
          <p style={{ color: 'var(--monarch-text-muted)' }}>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content-enter px-6 pb-48">
      {/* Header */}
      <ToolPageHeader
        icon={<StashIcon size={40} />}
        title="Stashes"
        description="Save for today's wants and tomorrow's needs."
        descriptionExtra={<StashGoalExplainerLink onClick={() => setShowExplainerModal(true)} />}
        onSettingsClick={() => setShowSettingsModal(true)}
      />

      {/* Tab navigation */}
      <div
        className="flex items-center gap-1 border-b pb-2"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        <button
          onClick={() => handleViewChange('stashes')}
          className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-2 flex items-center gap-1.5 transition-colors"
          style={{
            color: activeView === 'stashes' ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)',
            borderColor: activeView === 'stashes' ? 'var(--monarch-orange)' : 'transparent',
          }}
        >
          <StashIcon size={16} />
          Stashes
        </button>
        <button
          onClick={() => handleViewChange('reports')}
          className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-2 flex items-center gap-1.5 transition-colors"
          style={{
            color: activeView === 'reports' ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)',
            borderColor: activeView === 'reports' ? 'var(--monarch-orange)' : 'transparent',
          }}
        >
          <Icons.BarChart2 size={16} />
          Reports
        </button>
        <a
          href="https://app.monarch.com/goals/savings"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-2 flex items-center gap-1.5 hover-text-muted-to-dark"
          style={{ borderColor: 'transparent' }}
        >
          <Target size={16} />
          Monarch Goals
          <ExternalLink size={14} />
        </a>

        {/* Show Archived toggle - floated right */}
        {activeView === 'stashes' && archivedItems.length > 0 && (
          <div className="ml-auto flex items-center gap-2 select-none">
            <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              Show Archived
            </span>
            <button
              role="switch"
              aria-checked={showArchived}
              aria-label="Show archived stashes"
              onClick={() => setShowArchived(!showArchived)}
              className="toggle-switch relative w-10 h-5 rounded-full transition-colors cursor-pointer"
              style={{
                backgroundColor: showArchived ? 'var(--monarch-orange)' : 'var(--monarch-border)',
              }}
            >
              <span
                className="toggle-knob absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                style={{
                  transform: showArchived ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>
        )}
      </div>

      {/* Available Funds Bar with Distribute Button - floats at bottom */}
      {activeView === 'stashes' && stashData && (
        <AvailableFundsBar leftToBudget={leftToBudget} items={stashData.items} />
      )}

      {activeView === 'stashes' ? (
        <>
          <div className="mt-6 mb-6 w-full">
            <StashWidgetGrid
              items={activeItems}
              onEdit={handleEdit}
              onAllocate={handleAllocate}
              onLayoutChange={handleLayoutChange}
              onGoalLayoutChange={handleGoalLayoutChange}
              allocatingItemId={allocatingItemId}
              emptyMessage="No jars, no envelopes, no guesswork. Build your first stash."
              onAdd={() => setIsAddModalOpen(true)}
              onViewReport={handleViewStashReport}
              showTypeBadges={configData?.showMonarchGoals ?? false}
              archivedItems={
                showArchived
                  ? archivedItems.filter((item): item is StashItem => item.type === 'stash')
                  : undefined
              }
            />

            {/* Timeline Panel - positioned below cards */}
            <div className="mt-6">
              <TimelinePanel items={stashData?.items ?? []} formatCurrency={formatCurrency} />
            </div>
          </div>

          {/* Import button - only shown when not configured and not in hypothesis/distribution mode */}
          {!isBrowserConfigured && mode === null && (
            <div className="flex justify-center mb-3">
              <button
                data-tour="stash-sync-bookmarks"
                onClick={() => syncBookmarks()}
                disabled={isSyncing}
                className="flex items-center gap-2 px-2 py-1 text-sm font-medium transition-colors hover:opacity-80"
                style={{
                  color: 'var(--monarch-text-dark)',
                }}
              >
                <Icons.Download size={16} />
                Import Folder from Browser Bookmarks
              </button>
            </div>
          )}

          {/* Hide bookmark sections when in hypothesis/distribution mode */}
          {mode === null && pendingBookmarks.length > 0 && (
            <div ref={pendingSectionRef}>
              <PendingReviewSection
                isExpanded={isPendingExpanded}
                onToggle={() => setIsPendingExpanded(!isPendingExpanded)}
                pendingItems={pendingBookmarks}
                onSkip={handleSkipPending}
                onCreateTarget={handleCreateTarget}
                skippingIds={skippingIds}
              />
            </div>
          )}
          {/* Show collapsed section only when toggle is off and not in hypothesis/distribution mode */}
          {!showArchived && mode === null && (
            <ArchivedItemsSection
              items={archivedItems.filter((item): item is StashItem => item.type === 'stash')}
              onEdit={handleEdit}
              onAllocate={handleAllocate}
              allocatingItemId={allocatingItemId}
            />
          )}
          {mode === null && (
            <IgnoredBookmarksSection
              items={skippedBookmarks}
              onCreateTarget={handleCreateTarget}
              isExpanded={isIgnoredExpanded}
              onToggle={() => setIsIgnoredExpanded(!isIgnoredExpanded)}
            />
          )}
        </>
      ) : (
        <div className="mt-6">
          <StashReportsView />
        </div>
      )}
      <NewStashModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setModalPrefill(undefined);
          setSelectedPendingBookmark(null);
        }}
        onSuccess={() => {}}
        {...(modalPrefill && { prefill: modalPrefill })}
        {...(selectedPendingBookmark && { pendingBookmarkId: selectedPendingBookmark.id })}
        onPendingConverted={handlePendingConverted}
      />
      <EditStashModal
        isOpen={editingItem !== null}
        onClose={() => setEditingItem(null)}
        item={editingItem}
      />
      <BrowserSetupModal
        isOpen={showBrowserSetupWizard}
        onClose={() => setShowBrowserSetupWizard(false)}
        onComplete={() => setShowBrowserSetupWizard(false)}
      />
      <ToolSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        tool="stash"
      />
      <StashVsGoalsModal isOpen={showExplainerModal} onClose={() => setShowExplainerModal(false)} />

      {/* Scenario Sidebar Panel - for hypothesize mode */}
      <ScenarioSidebarPanel />

      {/* Navigation exit confirmation modal - shown when trying to leave page in hypothesize mode */}
      <ExitHypothesizeConfirmModal
        isOpen={showNavExitModal}
        onClose={handleNavExitCancel}
        onConfirmExit={handleNavExitConfirm}
      />

      {/* Sub-tab switch exit confirmation modals */}
      <ExitHypothesizeConfirmModal
        isOpen={showSubTabExitModal === 'hypothesize'}
        onClose={handleSubTabExitCancel}
        onConfirmExit={handleSubTabExitConfirm}
      />
      <ExitDistributeConfirmModal
        isOpen={showSubTabExitModal === 'distribute'}
        onClose={handleSubTabExitCancel}
        onConfirmExit={handleSubTabExitConfirm}
      />
    </div>
  );
}
