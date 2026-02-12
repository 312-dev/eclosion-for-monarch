/**
 * SkippedSection
 *
 * Collapsible section showing skipped transactions below the main transaction card.
 */

import { ChevronDown } from 'lucide-react';
import { TransactionList } from './TransactionList';
import type { Transaction, RefundsMatch } from '../../types/refunds';

interface SkippedSectionProps {
  readonly transactions: Transaction[];
  readonly matches: RefundsMatch[];
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleSelect: (txn: Transaction, shiftKey: boolean) => void;
  readonly onSelectAll: () => void;
  readonly onDeselectAll: () => void;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}

export function SkippedSection({
  transactions,
  matches,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  isOpen,
  onToggle,
}: SkippedSectionProps): React.JSX.Element | null {
  if (transactions.length === 0) return null;
  return (
    <div className="mt-3">
      <button
        type="button"
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-(--monarch-text-muted) hover:text-(--monarch-text-dark) transition-colors cursor-pointer rounded-lg hover:bg-(--monarch-bg-hover)"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
        />
        <span>
          {transactions.length} ignored transaction
          {transactions.length === 1 ? '' : 's'}
        </span>
      </button>
      {isOpen && (
        <div
          className="mt-1 rounded-lg border border-(--monarch-border) overflow-hidden opacity-75"
          style={{ backgroundColor: 'var(--monarch-bg-card)' }}
        >
          <TransactionList
            transactions={transactions}
            matches={matches}
            agingWarningDays={0}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onSelectAll={onSelectAll}
            onDeselectAll={onDeselectAll}
          />
        </div>
      )}
    </div>
  );
}
