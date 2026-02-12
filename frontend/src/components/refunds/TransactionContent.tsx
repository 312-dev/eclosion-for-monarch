import { SearchX } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { TallyBar } from './TallyBar';
import { TransactionSearchBar } from './TransactionSearchBar';
import { TransactionList } from './TransactionList';
import { SkippedSection } from './SkippedSection';
import type { Transaction, RefundsMatch, RefundsConfig, RefundsTally } from '../../types/refunds';

interface TransactionContentProps {
  readonly transactionsLoading: boolean;
  readonly filteredTransactions: Transaction[];
  readonly activeTransactions: Transaction[];
  readonly skippedTransactions: Transaction[];
  readonly expenseTransactions: Transaction[];
  readonly matches: RefundsMatch[];
  readonly config: RefundsConfig | undefined;
  readonly tally: RefundsTally;
  readonly pendingCount: number;
  readonly selectedCategoryIds: string[] | null;
  readonly onResetCategoryFilter: () => void;
  readonly searchQuery: string;
  readonly onSearchChange: (q: string) => void;
  readonly selectedIds: Set<string>;
  readonly onToggleSelect: (txn: Transaction, shiftKey: boolean) => void;
  readonly onSelectAll: () => void;
  readonly onDeselectAll: () => void;
  readonly showSkipped: boolean;
  readonly onToggleSkipped: () => void;
}

export function TransactionContent({
  transactionsLoading,
  filteredTransactions,
  activeTransactions,
  skippedTransactions,
  expenseTransactions,
  matches,
  config,
  tally,
  pendingCount,
  selectedCategoryIds,
  onResetCategoryFilter,
  searchQuery,
  onSearchChange,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  showSkipped,
  onToggleSkipped,
}: TransactionContentProps): React.ReactNode {
  if (transactionsLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-lg animate-pulse"
            style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
          />
        ))}
      </div>
    );
  }
  if (filteredTransactions.length === 0) {
    return (
      <EmptyState
        icon={<SearchX className="w-full h-full" />}
        title="No transactions found"
        description="No transactions match the selected tags, date range, and categories."
        size="md"
      />
    );
  }
  return (
    <>
      <div
        className="rounded-lg border border-(--monarch-border) overflow-hidden"
        style={{ backgroundColor: 'var(--monarch-bg-card)' }}
      >
        <TallyBar
          tally={tally}
          totalCount={pendingCount || expenseTransactions.length}
          onResetFilter={selectedCategoryIds === null ? undefined : onResetCategoryFilter}
        />
        <TransactionSearchBar value={searchQuery} onChange={onSearchChange} />
        {activeTransactions.length > 0 ? (
          <TransactionList
            transactions={activeTransactions}
            matches={matches}
            agingWarningDays={config?.agingWarningDays ?? 30}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onSelectAll={onSelectAll}
            onDeselectAll={onDeselectAll}
          />
        ) : (
          <div className="px-4 py-8 text-center text-sm text-(--monarch-text-muted)">
            All transactions have been skipped
          </div>
        )}
      </div>
      <SkippedSection
        transactions={skippedTransactions}
        matches={matches}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onSelectAll={onSelectAll}
        onDeselectAll={onDeselectAll}
        isOpen={showSkipped}
        onToggle={onToggleSkipped}
      />
    </>
  );
}
