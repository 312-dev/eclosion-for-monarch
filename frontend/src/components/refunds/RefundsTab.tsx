import { useState, useMemo, useCallback } from 'react';
import { Undo2 } from 'lucide-react';
import { ToolPageHeader } from '../ui/ToolPageHeader';
import { EmptyState, EmptyStateIcon } from '../ui/EmptyState';
import { SkeletonToolHeader, SkeletonTabs } from '../ui/SkeletonLayouts';
import { Button } from '../ui/Button';
import { ViewTabs } from './ViewTabs';
import { RefundsModals } from './RefundsModals';
import { DateRangeFilter, getDateRangeFromPreset } from './DateRangeFilter';
import { CategoryFilter } from './CategoryFilter';
import { TransactionContent } from './TransactionContent';
import { SelectionActionBar } from './SelectionActionBar';
import { useRefundsViewActions } from './useRefundsViewActions';
import { useTransactionPipeline } from './useTransactionPipeline';
import { useRefundsMatchHandlers } from './useRefundsMatchHandlers';
import { useRefundsSelection } from './useRefundsSelection';
import { useRefundsBatchActions } from './useRefundsBatchActions';
import { useExpectedRefundFlow } from './useExpectedRefundFlow';
import { useRefundsScroll } from './useRefundsScroll';
import { usePageTitle } from '../../hooks/usePageTitle';
import {
  useRefundsViewsQuery,
  useRefundsTagsQuery,
  useRefundsConfigQuery,
  useRefundsTransactionsQuery,
  useRefundsMatchesQuery,
  useReorderRefundsViewsMutation,
  useRefundsPendingCountQuery,
} from '../../api/queries/refundsQueries';
import type { Transaction, DateRangeFilter as DateRangeFilterType } from '../../types/refunds';

const DEFAULT_DATE_RANGE: DateRangeFilterType = {
  preset: 'all_time',
  ...getDateRangeFromPreset('all_time'),
};

export function RefundsTab() {
  usePageTitle('Refunds');
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeFilterType>(DEFAULT_DATE_RANGE);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[] | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [matchingTransaction, setMatchingTransaction] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSkipped, setShowSkipped] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [batchCount, setBatchCount] = useState(0);

  const { data: unsortedViews = [], isLoading: viewsLoading } = useRefundsViewsQuery();
  const views = useMemo(
    () => [...unsortedViews].sort((a, b) => a.sortOrder - b.sortOrder),
    [unsortedViews]
  );
  const { data: tags = [], isLoading: tagsLoading } = useRefundsTagsQuery();
  const { data: config } = useRefundsConfigQuery();
  const { data: matches = [] } = useRefundsMatchesQuery();
  const { data: pendingCountData } = useRefundsPendingCountQuery();
  const activeView = useMemo(() => {
    if (activeViewId) return views.find((v) => v.id === activeViewId) ?? null;
    return views.length > 0 ? views[0] : null;
  }, [views, activeViewId]);

  const effectiveViewId = activeView?.id ?? null;
  const tagIds = useMemo(() => activeView?.tagIds ?? [], [activeView?.tagIds]);
  const viewCategoryIds = activeView?.categoryIds ?? null;

  const { data: transactions = [], isLoading: transactionsLoading } = useRefundsTransactionsQuery(
    tagIds,
    dateRange.startDate,
    dateRange.endDate,
    viewCategoryIds
  );
  const viewActions = useRefundsViewActions({
    views,
    effectiveViewId,
    onViewDeleted: () => setActiveViewId(null),
  });

  const reorderMutation = useReorderRefundsViewsMutation();
  const handleReorderViews = useCallback(
    (ids: string[]) => reorderMutation.mutate(ids),
    [reorderMutation]
  );
  const mh = useRefundsMatchHandlers({
    matchingTransaction,
    setMatchingTransaction,
    matches,
    tagIds,
  });
  const pipeline = useTransactionPipeline({
    transactions,
    matches,
    tagIds,
    viewCategoryIds,
    dateRange,
    selectedCategoryIds,
    searchQuery,
    selectedIds,
  });
  const selection = useRefundsSelection({
    selectedIds,
    setSelectedIds,
    activeTransactions: pipeline.activeTransactions,
    skippedTransactions: pipeline.skippedTransactions,
    matches,
    creditGroups: pipeline.creditGroups,
    handleDirectSkip: mh.handleDirectSkip,
    handleDirectUnmatch: mh.handleDirectUnmatch,
    handleRestore: mh.handleRestore,
  });
  const batch = useRefundsBatchActions({
    selectedIds,
    setSelectedIds,
    activeTransactions: pipeline.activeTransactions,
    skippedTransactions: pipeline.skippedTransactions,
    matches,
    creditGroups: pipeline.creditGroups,
    allTransactions: transactions,
    handleBatchMatchAll: mh.handleBatchMatchAll,
    setMatchingTransaction,
    setBatchCount,
  });
  const expectedFlow = useExpectedRefundFlow({
    batchTransactions: batch.batchTransactions,
    handleBatchExpectedRefundAll: mh.handleBatchExpectedRefundAll,
    handleBatchClearExpected: selection.handleBatchClearExpected,
    setSelectedIds,
  });
  const { clearSelection } = selection;
  const resetFilters = useCallback(() => {
    setSelectedCategoryIds(null);
    setSearchQuery('');
    clearSelection();
  }, [clearSelection]);
  const handleDateRangeChange = useCallback(
    (r: DateRangeFilterType) => {
      setDateRange(r);
      resetFilters();
    },
    [resetFilters]
  );
  const handleSelectView = useCallback(
    (id: string | null) => {
      setActiveViewId(id);
      resetFilters();
    },
    [resetFilters]
  );

  const scroll = useRefundsScroll({
    setSearchQuery,
    setSelectedCategoryIds,
    setDateRange,
    defaultDateRange: DEFAULT_DATE_RANGE,
  });
  if (viewsLoading)
    return (
      <div>
        <SkeletonToolHeader />
        <SkeletonTabs />
      </div>
    );

  return (
    <div className="flex flex-col sm:h-full">
      <div className={`sm:flex-1 sm:overflow-y-auto${selectedIds.size > 0 ? ' pb-28' : ''}`}>
        <ToolPageHeader
          icon={<Undo2 size={24} />}
          title="Refunds"
          description="Track purchases awaiting refunds and reimbursements"
          onSettingsClick={() => setShowSettingsModal(true)}
        />
        {views.length === 0 ? (
          <EmptyState
            icon={<EmptyStateIcon />}
            title="No saved views yet"
            description="Create a view to track transactions by tag. Tag transactions in Monarch, then filter them here to track refunds."
            action={
              <Button onClick={() => viewActions.setShowCreateModal(true)}>
                + Create First View
              </Button>
            }
            size="lg"
          />
        ) : (
          <>
            <div className="sm:mt-3 max-sm:px-2 max-sm:pt-1">
              <ViewTabs
                views={views}
                activeViewId={effectiveViewId}
                viewCounts={pendingCountData?.viewCounts}
                onSelectView={handleSelectView}
                onAddView={() => viewActions.setShowCreateModal(true)}
                onEditView={viewActions.handleEditView}
                onReorder={handleReorderViews}
                trailing={
                  pipeline.viewCategoryCount > 1 ? (
                    <CategoryFilter
                      transactions={pipeline.expenseTransactions}
                      selectedCategoryIds={selectedCategoryIds}
                      onChange={setSelectedCategoryIds}
                    />
                  ) : undefined
                }
              />
            </div>
            <div className="mt-2 sm:mt-3">
              <TransactionContent
                transactionsLoading={transactionsLoading}
                filteredTransactions={pipeline.filteredTransactions}
                activeTransactions={pipeline.activeTransactions}
                skippedTransactions={pipeline.skippedTransactions}
                matches={matches}
                config={config}
                tally={pipeline.tally}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchTrailing={
                  <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
                }
                selectedIds={selectedIds}
                onToggleSelect={selection.handleToggleSelect}
                onToggleCreditGroup={selection.handleToggleCreditGroup}
                onSelectAll={selection.handleSelectAll}
                onDeselectAll={selection.handleDeselectAll}
                showSkipped={showSkipped}
                onToggleSkipped={() => setShowSkipped((prev) => !prev)}
                creditGroups={pipeline.creditGroups}
                onScrollToTransaction={scroll.handleScrollToTransaction}
                onScrollToCredit={scroll.handleScrollToCredit}
              />
            </div>
          </>
        )}
      </div>
      <RefundsModals
        viewActions={viewActions}
        tags={tags}
        tagsLoading={tagsLoading}
        matchingTransaction={matchingTransaction}
        onCloseMatch={batch.handleCloseMatch}
        config={config}
        existingMatch={mh.existingMatch}
        onMatch={batchCount > 1 ? batch.handleModalBatchMatch : mh.handleMatch}
        onSkip={mh.handleSkip}
        onUnmatch={mh.handleUnmatch}
        matchPending={mh.matchPending}
        batchCount={batchCount}
        batchAmount={selection.selectedAmount}
        batchTransactions={batch.batchTransactions}
        expectedTransaction={expectedFlow.expectedTransaction}
        onCloseExpected={expectedFlow.handleCloseExpected}
        onExpectedRefund={expectedFlow.handleModalExpectedRefund}
        expectedBatchCount={expectedFlow.expectedBatchCount}
        showClearExpectedConfirm={expectedFlow.showClearExpectedConfirm}
        onCloseClearExpected={expectedFlow.handleCloseClearExpected}
        onConfirmClearExpected={expectedFlow.handleConfirmClearExpected}
        clearExpectedCount={selectedIds.size}
        clearExpectedPending={mh.matchPending}
        showSettingsModal={showSettingsModal}
        onCloseSettings={() => setShowSettingsModal(false)}
      />
      {selectedIds.size > 0 && (
        <SelectionActionBar
          count={selectedIds.size}
          selectedAmount={selection.selectedAmount}
          selectionState={selection.selectionState}
          onMatch={batch.handleStartBatchMatch}
          onExpectedRefund={expectedFlow.handleStartBatchExpected}
          onSkip={selection.handleBatchSkip}
          onUnmatch={selection.handleBatchUnmatch}
          onRestore={selection.handleBatchRestore}
          onClearExpected={expectedFlow.handleStartClearExpected}
          onClear={selection.clearSelection}
          onExport={batch.handleExport}
        />
      )}
    </div>
  );
}
