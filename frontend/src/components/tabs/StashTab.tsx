/**
 * Stash Tab
 *
 * Displays stash items for savings goals with bookmark sync support.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
} from '../stash';
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
import type { StashItem, StashLayoutUpdate, PendingBookmark, MonarchGoal, MonarchGoalLayoutUpdate } from '../../types';

interface ModalPrefill {
  name?: string;
  sourceUrl?: string;
  sourceBookmarkId?: string;
}

export function StashTab() {
  usePageTitle('Stashes');
  const toast = useToast();

  // Tab state
  const [activeView, setActiveView] = useState<'stashes' | 'reports'>('stashes');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

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

  const isBrowserConfigured =
    !!configData?.selectedBrowser && (configData?.selectedFolderIds?.length ?? 0) > 0;

  const includeExpectedIncome = configData?.includeExpectedIncome ?? false;
  const bufferAmount = configData?.bufferAmount ?? 0;

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

  // Report settings for filtering
  const { setFilteredStashId } = useReportSettings();

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
      <div className="tab-content-enter px-6 pb-6 max-w-7xl mx-auto">
      {/* Header */}
      <ToolPageHeader
        icon={<StashIcon size={40} />}
        title="Stashes"
        description="Save for today's wants and tomorrow's needs."
        descriptionExtra={
          <StashGoalExplainerLink onClick={() => setShowExplainerModal(true)} />
        }
        onSettingsClick={() => setShowSettingsModal(true)}
      />

      {/* Tab navigation */}
      <div
        className="flex items-center gap-1 border-b pb-2"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        <button
          onClick={() => setActiveView('stashes')}
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
          onClick={() => setActiveView('reports')}
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
      </div>

      {/* Available Funds Bar with Distribute Button */}
      {activeView === 'stashes' && stashData && (
        <AvailableFundsBar
          includeExpectedIncome={includeExpectedIncome}
          bufferAmount={bufferAmount}
          leftToBudget={leftToBudget}
          items={stashData.items}
        />
      )}

      {activeView === 'stashes' ? (
        <>
          <div className="mb-6 w-full">
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
          </div>

          {/* Sync button - centered below grid */}
          <div className="flex justify-center mb-3">
            <button
              data-tour="stash-sync-bookmarks"
              onClick={syncBookmarks}
              disabled={isSyncing}
              className="flex items-center gap-2 px-2 py-1 text-sm font-medium transition-colors hover:opacity-80"
              style={{
                color: 'var(--monarch-text-dark)',
              }}
            >
              {isBrowserConfigured ? (
                <Icons.Refresh size={16} className={isSyncing ? 'animate-spin' : ''} />
              ) : (
                <Icons.Download size={16} />
              )}
              Import Folder from Browser Bookmarks
            </button>
          </div>

          {pendingBookmarks.length > 0 && (
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
          <ArchivedItemsSection
            items={archivedItems.filter((item): item is StashItem => item.type === 'stash')}
            onEdit={handleEdit}
            onAllocate={handleAllocate}
            allocatingItemId={allocatingItemId}
          />
          <IgnoredBookmarksSection
            items={skippedBookmarks}
            onCreateTarget={handleCreateTarget}
            isExpanded={isIgnoredExpanded}
            onToggle={() => setIsIgnoredExpanded(!isIgnoredExpanded)}
          />
        </>
      ) : (
        <StashReportsView />
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
      <StashVsGoalsModal
        isOpen={showExplainerModal}
        onClose={() => setShowExplainerModal(false)}
      />
    </div>
  );
}
