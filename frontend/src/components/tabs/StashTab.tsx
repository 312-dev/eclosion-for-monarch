/* eslint-disable max-lines */
/**
 * Stash Tab
 *
 * Displays stash items for savings goals with bookmark sync support.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { ExternalLink, Target } from 'lucide-react';
import { usePageTitle, useBookmarks, useStashSync, useLocalStorage } from '../../hooks';
import { STASH_INTRO_STATE_KEY } from '../../hooks/useStashTour';
import { PageLoadingSpinner } from '../ui/LoadingSpinner';
import { FolderSyncIcon, type FolderSyncIconHandle } from '../ui/FolderSyncIcon';
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
  getBrowserName,
  AvailableFundsBar,
  useReportSettings,
  StashVsGoalsModal,
  OPEN_STASH_VS_GOALS_EVENT,
  ScenarioSidebarPanel,
  ExitHypothesizeConfirmModal,
  ExitDistributeConfirmModal,
  TimelinePanel,
} from '../stash';
import { useDistributionMode } from '../../context/DistributionModeContext';
import { Icons } from '../icons';
import { StashIcon } from '../wizards/SetupWizardIcons';
import { ToolPageHeader, ToolSettingsModal, HorizontalTabsScroll } from '../ui';
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

/** Sync bookmarks button with animated folder-sync icon */
function SyncBookmarksButton({
  isBrowserConfigured,
  isSyncing,
  browserName,
  onSync,
}: {
  isBrowserConfigured: boolean;
  isSyncing: boolean;
  browserName: string;
  onSync: () => void;
}) {
  const syncIconRef = useRef<FolderSyncIconHandle>(null);

  // Control animation based on syncing state
  useEffect(() => {
    if (isSyncing) {
      syncIconRef.current?.startAnimation();
    } else {
      syncIconRef.current?.stopAnimation();
    }
  }, [isSyncing]);

  return (
    <div className="flex justify-center mb-3">
      <button
        data-tour="stash-sync-bookmarks"
        onClick={onSync}
        onMouseEnter={() => syncIconRef.current?.startAnimation()}
        onMouseLeave={() => !isSyncing && syncIconRef.current?.stopAnimation()}
        disabled={isSyncing}
        className="flex items-center gap-2 px-2 py-1 text-sm font-medium transition-colors hover:opacity-80"
        style={{
          color: 'var(--monarch-text-dark)',
        }}
      >
        {isBrowserConfigured ? (
          <>
            <FolderSyncIcon ref={syncIconRef} size={16} className="pointer-events-none" />
            Sync {browserName}
          </>
        ) : (
          <>
            <Icons.Download size={16} />
            Import Folder from Browser Bookmarks
          </>
        )}
      </button>
    </div>
  );
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
  const [selectedPendingBookmark, setSelectedPendingBookmark] = useState<PendingBookmark | null>(
    null
  );
  const [skippingIds, setSkippingIds] = useState<Set<string>>(new Set());
  const [showBrowserSetupWizard, setShowBrowserSetupWizard] = useState(false);
  const [showExplainerModal, setShowExplainerModal] = useState(false);
  const [allocatingItemId, setAllocatingItemId] = useState<string | null>(null);
  const pendingSectionRef = useRef<HTMLDivElement>(null);

  // Track whether user has seen the intro modal (Stashes vs Monarch Goals)
  const [introState, setIntroState] = useLocalStorage<{ hasSeenIntro: boolean }>(
    STASH_INTRO_STATE_KEY,
    { hasSeenIntro: false }
  );

  // Auto-open intro modal on first visit (before guided tour starts)
  const introShownRef = useRef(false);
  useEffect(() => {
    // Only show once per session and only if not seen before
    if (!introState.hasSeenIntro && !introShownRef.current && !configLoading && !isLoading) {
      introShownRef.current = true;
      setShowExplainerModal(true);
    }
  }, [introState.hasSeenIntro, configLoading, isLoading]);

  // Handle intro modal close - mark as seen to trigger guided tour
  const handleExplainerModalClose = useCallback(() => {
    setShowExplainerModal(false);
    if (!introState.hasSeenIntro) {
      setIntroState({ hasSeenIntro: true });
    }
  }, [introState.hasSeenIntro, setIntroState]);

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

  // Listen for help menu event to open Stash vs Goals modal
  useEffect(() => {
    const handler = () => setShowExplainerModal(true);
    globalThis.addEventListener(OPEN_STASH_VS_GOALS_EVENT, handler);
    return () => globalThis.removeEventListener(OPEN_STASH_VS_GOALS_EVENT, handler);
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
      <div className="tab-content-enter pb-6">
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
    <div className="tab-content-enter pb-48">
      {/* Header */}
      <ToolPageHeader
        icon={<StashIcon size={40} />}
        title="Stashes"
        description="Save for today's wants and tomorrow's needs."
        onSettingsClick={() => setShowSettingsModal(true)}
      />

      {/* Tab navigation - horizontally scrollable on mobile with fade effect */}
      <div className="border-b" style={{ borderColor: 'var(--monarch-border)' }}>
        <HorizontalTabsScroll innerClassName="pb-2">
          <button
            onClick={() => handleViewChange('stashes')}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-2 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            style={{
              color:
                activeView === 'stashes' ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)',
              borderColor: activeView === 'stashes' ? 'var(--monarch-orange)' : 'transparent',
            }}
          >
            <StashIcon size={16} />
            Stashes
          </button>
          <button
            data-tour="stash-reports-tab"
            onClick={() => handleViewChange('reports')}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-2 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            style={{
              color:
                activeView === 'reports' ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)',
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
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-2 flex items-center gap-1.5 hover-text-muted-to-dark whitespace-nowrap shrink-0"
            style={{ borderColor: 'transparent' }}
          >
            <Target size={16} />
            Monarch Goals
            <ExternalLink size={14} />
          </a>
        </HorizontalTabsScroll>
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
            />

            {/* Timeline Panel - positioned below cards */}
            <div className="mt-6">
              <TimelinePanel items={stashData?.items ?? []} formatCurrency={formatCurrency} />
            </div>
          </div>

          {/* Sync/Import button - hidden during hypothesis/distribution mode */}
          {mode === null && (
            <SyncBookmarksButton
              isBrowserConfigured={isBrowserConfigured}
              isSyncing={isSyncing}
              browserName={getBrowserName(configData?.selectedBrowser ?? null)}
              onSync={() => syncBookmarks()}
            />
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
          {/* Past / Archived section - always visible when there are archived items */}
          {mode === null && (
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
      <StashVsGoalsModal isOpen={showExplainerModal} onClose={handleExplainerModalClose} />

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
