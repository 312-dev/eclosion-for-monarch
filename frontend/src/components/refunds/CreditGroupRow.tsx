/**
 * CreditGroupRow
 *
 * Expandable row representing a credit group (actual refund or expected refund).
 * Shows the refund/expected credit as a colored row that expands to reveal
 * linked original transactions.
 *
 * The checkbox selects the credit group entity itself (not its children).
 */

import React, { useState, useCallback } from 'react';
import { ChevronRight, RotateCcw, Check } from 'lucide-react';
import { decodeHtmlEntities } from '../../utils';
import type { Transaction, CreditGroup } from '../../types/refunds';

interface CreditGroupRowProps {
  readonly group: CreditGroup;
  readonly transactions: Transaction[];
  readonly onScrollToTransaction: (id: string) => void;
  readonly isSelected: boolean;
  readonly onToggleSelect: (groupId: string) => void;
}

function getPrefix(amount: number): string {
  if (amount > 0) return '+';
  if (amount < 0) return '-';
  return '';
}

function formatAmount(amount: number): string {
  return `${getPrefix(amount)}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Desktop-only 6-column grid matching TransactionRow/header. */
const GRID_CLASSES_DESKTOP =
  'hidden md:grid gap-x-3 grid-cols-[48px_24px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_130px]';

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

type Coverage = 'full' | 'partial' | 'none';

interface OriginalCoverage {
  transaction: Transaction;
  coverage: Coverage;
  /** For partial: the amount still owed (negative). */
  remainingAmount: number;
}

/** Distribute refund across originals in order; return per-txn coverage. */
function computeCoverage(refundAmount: number, originals: Transaction[]): OriginalCoverage[] {
  let available = Math.abs(refundAmount);
  return originals.map((txn) => {
    const expense = Math.abs(txn.amount);
    if (available >= expense) {
      available -= expense;
      return { transaction: txn, coverage: 'full', remainingAmount: 0 };
    }
    if (available > 0) {
      const remaining = expense - available;
      available = 0;
      return { transaction: txn, coverage: 'partial', remainingAmount: -remaining };
    }
    return { transaction: txn, coverage: 'none', remainingAmount: txn.amount };
  });
}

function OriginalRow({
  transaction,
  coverage,
  remainingAmount,
  onClick,
}: {
  readonly transaction: Transaction;
  readonly coverage: Coverage;
  readonly remainingAmount: number;
  readonly onClick: () => void;
}): React.JSX.Element {
  const merchantName = decodeHtmlEntities(transaction.merchant?.name ?? transaction.originalName);
  const shortDate = formatShortDate(transaction.date);
  const isCovered = coverage === 'full';
  const isPartial = coverage === 'partial';
  const dimClass = isCovered ? 'opacity-50' : '';

  return (
    <button
      type="button"
      className={`w-full p-0 text-left text-xs hover:bg-(--monarch-bg-hover) transition-colors rounded cursor-pointer ${dimClass}`}
      onClick={onClick}
      aria-label={`Scroll to ${merchantName}`}
    >
      {/* Desktop: grid aligned to parent columns */}
      <div className={`items-center px-4 py-1.5 ${GRID_CLASSES_DESKTOP}`}>
        <div />
        <div />
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-(--monarch-text-muted) tabular-nums shrink-0 w-10 text-right">
            {shortDate}
          </span>
          <span className="text-(--monarch-text-muted) truncate">{merchantName}</span>
        </div>
        <div />
        <div />
        <div className="flex items-center justify-end gap-2">
          {isPartial && (
            <span className="tabular-nums font-medium text-(--monarch-error)">
              {formatAmount(remainingAmount)}
            </span>
          )}
          <span
            className={`tabular-nums font-medium ${isCovered || isPartial ? 'line-through text-(--monarch-text-muted)' : 'text-(--monarch-error)'}`}
          >
            {formatAmount(transaction.amount)}
          </span>
        </div>
      </div>
      {/* Mobile */}
      <div
        className="md:hidden flex items-center gap-2 pr-3 py-1.5"
        style={{ paddingLeft: 'calc(0.75rem + 20px)' }}
      >
        <span className="text-(--monarch-text-muted) tabular-nums shrink-0 w-10 text-right">
          {shortDate}
        </span>
        <span className="text-(--monarch-text-muted) truncate flex-1">{merchantName}</span>
        {isPartial && (
          <span className="tabular-nums font-medium shrink-0 text-(--monarch-error)">
            {formatAmount(remainingAmount)}
          </span>
        )}
        <span
          className={`tabular-nums font-medium shrink-0 ${isCovered || isPartial ? 'line-through text-(--monarch-text-muted)' : 'text-(--monarch-error)'}`}
        >
          {formatAmount(transaction.amount)}
        </span>
      </div>
    </button>
  );
}

function getCheckboxClassName(isSelected: boolean): string {
  return isSelected
    ? 'bg-(--monarch-orange) border-(--monarch-orange) text-white'
    : 'border-(--monarch-text-muted)/40 hover:border-(--monarch-text-muted)';
}

export const CreditGroupRow = React.memo(function CreditGroupRow({
  group,
  transactions,
  onScrollToTransaction,
  isSelected,
  onToggleSelect,
}: CreditGroupRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRefund = group.type === 'refund';
  const colorClass = isRefund ? 'text-(--monarch-success)' : 'text-(--monarch-accent)';
  const defaultBgClass = isRefund ? 'bg-(--monarch-success)/5' : 'bg-(--monarch-accent)/5';
  const bgClass = isSelected ? 'bg-(--monarch-orange)/5' : defaultBgClass;
  const label = isRefund ? (group.merchant ?? 'Refund') : 'Expecting';
  const Icon = RotateCcw;

  const toggle = useCallback(() => setIsExpanded((prev) => !prev), []);

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSelect(group.id);
    },
    [onToggleSelect, group.id]
  );

  const originals = transactions.filter((t) => group.originalTransactionIds.includes(t.id));
  const coverageItems = isExpanded ? computeCoverage(group.amount, originals) : [];

  return (
    <div className={`border-b border-(--monarch-border) ${bgClass}`}>
      {/* Collapsed row */}
      {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- button can't contain block-level children */}
      <div
        className="w-full cursor-pointer hover:bg-(--monarch-bg-hover) transition-colors"
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        aria-expanded={isExpanded}
        aria-label={`${label}: ${formatAmount(group.amount)}, ${group.originalTransactionIds.length} original transaction${group.originalTransactionIds.length === 1 ? '' : 's'}`}
      >
        {/* Desktop grid */}
        <div className={`items-center px-4 py-3 ${GRID_CLASSES_DESKTOP}`}>
          <div className="flex items-center justify-center">
            <button
              type="button"
              className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${getCheckboxClassName(isSelected)}`}
              aria-label={isSelected ? 'Deselect group' : 'Select group'}
              onClick={handleCheckboxClick}
            >
              {isSelected && <Check size={14} />}
            </button>
          </div>
          <Icon size={16} className={colorClass} />
          <div className="min-w-0 flex items-center gap-1.5">
            <span className={`font-medium text-sm truncate ${colorClass}`}>
              {label} ({group.originalTransactionIds.length})
            </span>
            {group.note && (
              <span className="text-xs text-(--monarch-text-muted) truncate">{group.note}</span>
            )}
          </div>
          <div className="min-w-0" />
          <div className="min-w-0">
            {group.account && (
              <span className="text-xs text-(--monarch-text-muted) truncate block">
                {group.account}
              </span>
            )}
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <span className={`text-sm font-medium tabular-nums ${colorClass}`}>
              {formatAmount(group.amount)}
            </span>
            <ChevronRight
              size={14}
              className={`transition-transform text-(--monarch-text-muted) shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
            />
          </div>
        </div>
        {/* Mobile card */}
        <div className="md:hidden px-3 py-2.5 flex items-center gap-3">
          <div className="flex items-center justify-center w-5 shrink-0">
            <button
              type="button"
              className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${getCheckboxClassName(isSelected)}`}
              aria-label={isSelected ? 'Deselect group' : 'Select group'}
              onClick={handleCheckboxClick}
            >
              {isSelected && <Check size={14} />}
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Icon size={16} className={`shrink-0 ${colorClass}`} />
              <span className={`font-medium text-sm truncate flex-1 min-w-0 ${colorClass}`}>
                {label}
              </span>
              <span className={`text-sm font-medium tabular-nums shrink-0 ${colorClass}`}>
                {formatAmount(group.amount)}
              </span>
              <ChevronRight
                size={14}
                className={`transition-transform text-(--monarch-text-muted) shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded: original transactions */}
      {isExpanded && (
        <div className="pb-2 animate-expand">
          {coverageItems.map((item) => (
            <OriginalRow
              key={item.transaction.id}
              transaction={item.transaction}
              coverage={item.coverage}
              remainingAmount={item.remainingAmount}
              onClick={() => onScrollToTransaction(item.transaction.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
});
