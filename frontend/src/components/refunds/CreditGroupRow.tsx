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
import { ChevronRight, Undo2, CalendarClock, Check, StickyNote } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { AccountIcon } from './TransactionRowParts';
import { linkifyText } from '../../utils/refunds';
import type { Transaction, CreditGroup } from '../../types/refunds';
import { formatAmount, computeCoverage, OriginalRow, HiddenCountRow } from './CreditGroupParts';

interface CreditGroupRowProps {
  readonly group: CreditGroup;
  readonly transactions: Transaction[];
  /** IDs of transactions passing all filters. When set, originals not in this set are hidden behind a reveal toggle. */
  readonly filteredTransactionIds?: ReadonlySet<string> | undefined;
  readonly onScrollToTransaction: (id: string) => void;
  readonly isSelected: boolean;
  readonly onToggleSelect: (groupId: string) => void;
}

/** Desktop-only 6-column grid matching TransactionRow/header. */
const GRID_CLASSES_DESKTOP =
  'hidden md:grid gap-x-3 grid-cols-[48px_24px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_130px]';

function NoteIcon({ note }: { readonly note: string }): React.JSX.Element {
  return (
    <Tooltip
      sticky
      content={
        <span
          className="block max-h-48 overflow-y-auto custom-scrollbar"
          style={{ whiteSpace: 'pre-line' }}
        >
          {linkifyText(note)}
        </span>
      }
    >
      <button
        type="button"
        aria-label="Group notes"
        className="inline-flex"
        onClick={(e) => e.stopPropagation()}
      >
        <StickyNote size={14} className="text-(--monarch-text-muted) shrink-0" />
      </button>
    </Tooltip>
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
  filteredTransactionIds,
  onScrollToTransaction,
  isSelected,
  onToggleSelect,
}: CreditGroupRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const isRefund = group.type === 'refund';
  const colorClass = isRefund ? 'text-(--monarch-success)' : 'text-(--monarch-accent)';
  const defaultBgClass = isRefund ? 'bg-(--monarch-success)/5' : 'bg-(--monarch-accent)/5';
  const bgClass = isSelected ? 'bg-(--monarch-orange)/5' : defaultBgClass;
  const label = isRefund ? (group.merchant ?? 'Refund') : 'Expecting';
  const Icon = isRefund ? Undo2 : CalendarClock;

  const toggle = useCallback(() => {
    setIsExpanded((prev) => {
      if (prev) setShowHidden(false); // reset reveal on collapse
      return !prev;
    });
  }, []);

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSelect(group.id);
    },
    [onToggleSelect, group.id]
  );

  const originals = transactions.filter((t) => group.originalTransactionIds.includes(t.id));
  const hasFilter = filteredTransactionIds != null;
  const visibleOriginals = hasFilter
    ? originals.filter((t) => filteredTransactionIds.has(t.id))
    : originals;
  const hiddenCount = originals.length - visibleOriginals.length;

  const displayedOriginals = showHidden ? originals : visibleOriginals;
  const coverageItems = isExpanded ? computeCoverage(group.amount, displayedOriginals) : [];

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
          <div className="w-6 h-6 flex items-center justify-center">
            <Icon size={16} className={colorClass} />
          </div>
          <div className="min-w-0 flex items-center gap-1.5">
            <span className={`font-medium text-sm truncate ${colorClass}`}>
              {label} ({group.originalTransactionIds.length})
            </span>
          </div>
          <div className="min-w-0" />
          <div className="min-w-0 flex items-center gap-1.5">
            {group.account && (
              <>
                <AccountIcon account={group.account} />
                <span className="text-sm text-(--monarch-text-muted) truncate">
                  {group.account.displayName}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center justify-end gap-1.5">
            {group.note && <NoteIcon note={group.note} />}
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
              {group.note && <NoteIcon note={group.note} />}
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
          {coverageItems.map((item) => {
            const isHiddenOriginal = hasFilter && !filteredTransactionIds.has(item.transaction.id);
            return (
              <OriginalRow
                key={item.transaction.id}
                transaction={item.transaction}
                coverage={item.coverage}
                remainingAmount={item.remainingAmount}
                isRefund={isRefund}
                dim={isHiddenOriginal}
                onClick={() => onScrollToTransaction(item.transaction.id)}
              />
            );
          })}
          {hiddenCount > 0 && !showHidden && (
            <HiddenCountRow
              count={hiddenCount}
              label="not matching filter"
              onClick={(e) => {
                e.stopPropagation();
                setShowHidden(true);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
});
