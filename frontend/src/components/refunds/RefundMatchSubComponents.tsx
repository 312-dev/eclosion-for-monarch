/**
 * Sub-components for the RefundMatchModal.
 * Extracted to keep RefundMatchModal under the 300-line limit.
 */

import { useRef, useEffect } from 'react';
import { SearchX, FilterX, Receipt, AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Tooltip } from '../ui/Tooltip';
import { decodeHtmlEntities } from '../../utils';
import type { Transaction, RefundsMatch } from '../../types/refunds';

export interface RefundCandidateMatchInfo {
  matchedCount: number;
  consumedAmount: number;
}

export function formatAmount(amount: number): string {
  return `$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function MatchDetailsContent({
  existingMatch,
}: {
  readonly existingMatch: RefundsMatch;
}): React.JSX.Element {
  if (existingMatch.skipped) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-(--monarch-text-muted) italic">
          This transaction was skipped (no refund match).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm space-y-1">
        <p className="text-(--monarch-text-dark)">
          <span className="font-medium">Refund amount:</span>{' '}
          {existingMatch.refundAmount == null ? 'N/A' : formatAmount(existingMatch.refundAmount)}
        </p>
        {existingMatch.refundMerchant && (
          <p className="text-(--monarch-text-dark)">
            <span className="font-medium">From:</span> {existingMatch.refundMerchant}
          </p>
        )}
        {existingMatch.refundDate && (
          <p className="text-(--monarch-text-dark)">
            <span className="font-medium">Date:</span> {formatDate(existingMatch.refundDate)}
          </p>
        )}
        {existingMatch.refundAccount && (
          <p className="text-(--monarch-text-dark)">
            <span className="font-medium">Account:</span> {existingMatch.refundAccount}
          </p>
        )}
      </div>
    </div>
  );
}

interface SearchResultsListProps {
  readonly searching: boolean;
  readonly candidates: Transaction[];
  readonly searchQuery: string;
  readonly selectedTxnId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onClearFilters: () => void;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly onLoadMore: () => void;
  readonly candidateMatchInfo: Map<string, RefundCandidateMatchInfo>;
  readonly selectionAmount: number;
}

export function SearchResultsList({
  searching,
  candidates,
  searchQuery,
  selectedTxnId,
  onSelect,
  onClearFilters,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  candidateMatchInfo,
  selectionAmount,
}: SearchResultsListProps): React.JSX.Element {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  if (searching && candidates.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="px-3 py-8 text-sm text-center text-(--monarch-text-muted)">
        {searchQuery ? (
          <div className="space-y-2">
            <SearchX size={24} className="mx-auto text-(--monarch-text-muted)" />
            <p>No refund transactions found</p>
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 text-white hover:underline"
            >
              <FilterX size={14} />
              Clear filters
            </button>
          </div>
        ) : (
          'No recent transactions'
        )}
      </div>
    );
  }

  return (
    <>
      {candidates.map((txn) => {
        const isSelected = txn.id === selectedTxnId;
        const matchInfo = candidateMatchInfo.get(txn.id);
        const remaining = matchInfo
          ? Math.max(0, txn.amount - matchInfo.consumedAmount)
          : txn.amount;
        const hasWarning = matchInfo != null && remaining < selectionAmount;
        return (
          <button
            key={txn.id}
            type="button"
            onClick={() => onSelect(txn.id)}
            className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-2 transition-colors hover:bg-(--monarch-bg-hover) border-b border-(--monarch-border) last-of-type:border-b-0 ${
              isSelected ? 'bg-(--monarch-orange)/10' : ''
            }`}
            aria-pressed={isSelected}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? 'border-(--monarch-orange)' : 'border-(--monarch-border)'
                }`}
              >
                {isSelected && <div className="w-2 h-2 rounded-full bg-(--monarch-orange)" />}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-(--monarch-text-dark) truncate">
                  {decodeHtmlEntities(txn.merchant?.name ?? txn.originalName)}
                </div>
                <div className="text-xs text-(--monarch-text-muted)">
                  {formatDate(txn.date)}
                  {txn.account && ` · ${decodeHtmlEntities(txn.account.displayName)}`}
                  {matchInfo && (
                    <>
                      {' · '}
                      <Tooltip
                        content={`${matchInfo.matchedCount} other transaction${matchInfo.matchedCount === 1 ? '' : 's'} associated`}
                        side="top"
                      >
                        <span className="text-(--monarch-success) cursor-help">
                          <Receipt size={14} className="inline -mt-px" /> {matchInfo.matchedCount}
                        </span>
                      </Tooltip>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="font-medium text-(--monarch-success) tabular-nums">
                +{formatAmount(txn.amount)}
              </span>
              {matchInfo && (
                <div className="flex items-center justify-end gap-1 text-xs tabular-nums text-(--monarch-text-muted)">
                  {hasWarning && (
                    <AlertTriangle size={11} className="text-(--monarch-warning) shrink-0" />
                  )}
                  <span className={hasWarning ? 'text-(--monarch-warning)' : ''}>
                    {formatAmount(remaining)} left
                  </span>
                </div>
              )}
            </div>
          </button>
        );
      })}
      <div ref={sentinelRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-3">
          <LoadingSpinner size="sm" />
        </div>
      )}
    </>
  );
}
