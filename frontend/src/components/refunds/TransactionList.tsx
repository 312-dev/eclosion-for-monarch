/**
 * TransactionList
 *
 * Groups transactions by date and renders them in a list with date headers.
 * Includes a header row with a tri-state select-all checkbox.
 */

import { useMemo } from 'react';
import { Check, Minus } from 'lucide-react';
import { TransactionRow } from './TransactionRow';
import type { Transaction, RefundsMatch } from '../../types/refunds';

interface TransactionListProps {
  readonly transactions: Transaction[];
  readonly matches: RefundsMatch[];
  readonly agingWarningDays: number;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleSelect: (transaction: Transaction, shiftKey: boolean) => void;
  readonly onSelectAll: () => void;
  readonly onDeselectAll: () => void;
}

interface DateGroup {
  date: string;
  label: string;
  total: number;
  transactions: Transaction[];
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function groupByDate(transactions: Transaction[]): DateGroup[] {
  const groups = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    const date = txn.date;
    const existing = groups.get(date);
    if (existing) {
      existing.push(txn);
    } else {
      groups.set(date, [txn]);
    }
  }

  // Sort by date descending
  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, txns]) => ({
      date,
      label: formatDateHeader(date),
      total: txns.reduce((sum, t) => sum + t.amount, 0),
      transactions: txns,
    }));
}

type CheckboxState = 'none' | 'some' | 'all';

function getHeaderCheckboxState(
  transactions: Transaction[],
  selectedIds: ReadonlySet<string>
): CheckboxState {
  if (selectedIds.size === 0) return 'none';
  const selectedCount = transactions.filter((t) => selectedIds.has(t.id)).length;
  if (selectedCount === 0) return 'none';
  if (selectedCount === transactions.length) return 'all';
  return 'some';
}

/**
 * Same grid column layout as TransactionRow for alignment.
 * See TransactionRow.tsx GRID_CLASSES for the full responsive spec.
 */
const HEADER_GRID_CLASSES =
  'grid gap-x-3 grid-cols-[48px_24px_minmax(0,1fr)_130px] sm:grid-cols-[48px_24px_minmax(0,1.5fr)_minmax(0,1fr)_130px] md:grid-cols-[48px_24px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_130px]';

function getSelectAllCheckboxClassName(state: CheckboxState): string {
  if (state === 'none')
    return 'border-(--monarch-text-muted)/40 hover:border-(--monarch-text-muted)';
  return 'bg-(--monarch-orange) border-(--monarch-orange) text-white';
}

export function TransactionList({
  transactions,
  matches,
  agingWarningDays,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
}: TransactionListProps) {
  const matchesByOriginalId = useMemo(() => {
    const map = new Map<string, RefundsMatch>();
    for (const m of matches) {
      map.set(m.originalTransactionId, m);
    }
    return map;
  }, [matches]);

  /** Per-match effective refund amount, split evenly when a refund is shared. */
  const effectiveRefundMap = useMemo(() => {
    const refundShareCount = new Map<string, number>();
    for (const m of matches) {
      if (!m.skipped && m.refundTransactionId) {
        refundShareCount.set(
          m.refundTransactionId,
          (refundShareCount.get(m.refundTransactionId) ?? 0) + 1
        );
      }
    }
    const map = new Map<string, number>();
    for (const m of matches) {
      if (!m.skipped && m.refundTransactionId && m.refundAmount != null) {
        const count = refundShareCount.get(m.refundTransactionId) ?? 1;
        map.set(m.originalTransactionId, m.refundAmount / count);
      }
    }
    return map;
  }, [matches]);

  const dateGroups = useMemo(() => groupByDate(transactions), [transactions]);

  const checkboxState = useMemo(
    () => getHeaderCheckboxState(transactions, selectedIds),
    [transactions, selectedIds]
  );

  if (transactions.length === 0) {
    return null;
  }

  const handleHeaderCheckboxClick = checkboxState === 'none' ? onSelectAll : onDeselectAll;
  const headerCheckboxLabel =
    checkboxState === 'none' ? 'Select all transactions' : 'Deselect all transactions';

  return (
    <div className="divide-y divide-(--monarch-border)">
      {/* Column header row */}
      <div className={`items-center px-4 py-2 bg-(--monarch-bg-page) ${HEADER_GRID_CLASSES}`}>
        <div className="flex items-center justify-center">
          <button
            type="button"
            className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${getSelectAllCheckboxClassName(checkboxState)}`}
            aria-label={headerCheckboxLabel}
            onClick={handleHeaderCheckboxClick}
          >
            {checkboxState === 'all' && <Check size={14} />}
            {checkboxState === 'some' && <Minus size={14} />}
          </button>
        </div>
        <div /> {/* icon column spacer */}
        <span className="text-xs font-medium text-(--monarch-text-muted)">Name</span>
        <span className="text-xs font-medium text-(--monarch-text-muted) hidden sm:block">
          Category
        </span>
        <span className="text-xs font-medium text-(--monarch-text-muted) hidden md:block">
          Account
        </span>
        <span className="text-xs font-medium text-(--monarch-text-muted) text-right">Amount</span>
      </div>

      {dateGroups.map((group) => (
        <div key={group.date}>
          <div className="flex items-center justify-between px-4 py-2 text-xs font-medium uppercase tracking-wide text-(--monarch-text-muted) bg-(--monarch-bg-page)">
            <span>{group.label}</span>
            <span className="tabular-nums">
              $
              {Math.abs(group.total).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          {group.transactions.map((txn) => (
            <TransactionRow
              key={txn.id}
              transaction={txn}
              match={matchesByOriginalId.get(txn.id)}
              effectiveRefundAmount={effectiveRefundMap.get(txn.id)}
              agingWarningDays={agingWarningDays}
              isSelected={selectedIds.has(txn.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
