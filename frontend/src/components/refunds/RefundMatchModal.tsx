/**
 * RefundMatchModal
 *
 * Modal for matching a transaction to its refund.
 * Shows search results, allows selecting a refund transaction or skipping.
 * Optionally replaces the original tag with a configured replacement tag.
 *
 * In batch mode (batchCount > 1), the title and submit button reflect
 * that all selected transactions will be matched to the same refund.
 * The Skip button is hidden in batch mode.
 */

import { useState, useMemo, useCallback, useRef, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { PrimaryButton, CancelButton, WarningButton, ModalButton } from '../ui/ModalButtons';
import { Tooltip } from '../ui/Tooltip';
import {
  useSearchRefundsTransactionsQuery,
  useRefundsMatchesQuery,
} from '../../api/queries/refundsQueries';
import { decodeHtmlEntities } from '../../utils';
import {
  MatchDetailsContent,
  SearchResultsList,
  formatAmount,
  formatDate,
  type RefundCandidateMatchInfo,
} from './RefundMatchSubComponents';
import type { Transaction, RefundsConfig, RefundsMatch } from '../../types/refunds';

interface RefundMatchModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly transaction: Transaction;
  readonly config: RefundsConfig | undefined;
  readonly existingMatch: RefundsMatch | undefined;
  readonly onMatch: (params: {
    refundTransactionId: string;
    refundAmount: number;
    refundMerchant: string;
    refundDate: string;
    refundAccount: string;
    replaceTag: boolean;
  }) => void;
  readonly onSkip: () => void;
  readonly onUnmatch: () => void;
  readonly matching: boolean;
  readonly batchCount: number;
  readonly batchAmount: number;
  readonly batchTransactions: Transaction[];
}

export function RefundMatchModal({
  isOpen,
  onClose,
  transaction,
  config,
  existingMatch,
  onMatch,
  onSkip,
  onUnmatch,
  matching,
  batchCount,
  batchAmount,
  batchTransactions,
}: RefundMatchModalProps) {
  const merchantName = decodeHtmlEntities(transaction.merchant?.name ?? transaction.originalName);
  const isBatch = batchCount > 1;
  const defaultSearch = isBatch ? batchAmount.toFixed(2) : Math.abs(transaction.amount).toFixed(2);
  const [searchQuery, setSearchQuery] = useState(defaultSearch);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [replaceTag, setReplaceTag] = useState(config?.replaceTagByDefault ?? false);
  const hasReplacementTag = config?.replacementTagId != null;
  const isAlreadyMatched = existingMatch != null;
  const hasMultipleTags = isBatch && batchTransactions.some((txn) => txn.tags.length > 1);
  const tagNoun = hasMultipleTags ? 'tags' : 'tag';
  const tagActionLabel = hasReplacementTag
    ? `Replace ${tagNoun} with configured replacement`
    : `Remove ${tagNoun}`;
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [prevTxnId, setPrevTxnId] = useState(transaction.id);
  if (prevTxnId !== transaction.id) {
    setPrevTxnId(transaction.id);
    setSearchQuery(defaultSearch);
    setSelectedTxnId(null);
  }

  const {
    data: searchData,
    isLoading: searching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useSearchRefundsTransactionsQuery(searchQuery);

  const { data: allMatches } = useRefundsMatchesQuery();

  const refundCandidates = useMemo(() => {
    const allResults = searchData?.pages.flatMap((p) => p.transactions) ?? [];
    return allResults.filter((t) => t.id !== transaction.id && t.amount > 0);
  }, [searchData, transaction.id]);

  const selectionAmount = isBatch ? batchAmount : Math.abs(transaction.amount);

  const candidateMatchInfo = useMemo(() => {
    const info = new Map<string, RefundCandidateMatchInfo>();
    if (!allMatches) return info;
    for (const match of allMatches) {
      if (!match.refundTransactionId || match.skipped) continue;
      const existing = info.get(match.refundTransactionId);
      const originalAmount = Math.abs(match.transactionData?.amount ?? 0);
      if (existing) {
        existing.matchedCount += 1;
        existing.consumedAmount += originalAmount;
      } else {
        info.set(match.refundTransactionId, {
          matchedCount: 1,
          consumedAmount: originalAmount,
        });
      }
    }
    return info;
  }, [allMatches]);

  const selectedTxn = useMemo(
    () => refundCandidates.find((t) => t.id === selectedTxnId),
    [refundCandidates, selectedTxnId]
  );

  const handleMatch = useCallback(() => {
    if (!selectedTxn) return;
    onMatch({
      refundTransactionId: selectedTxn.id,
      refundAmount: selectedTxn.amount,
      refundMerchant: selectedTxn.merchant?.name ?? selectedTxn.originalName,
      refundDate: selectedTxn.date,
      refundAccount: selectedTxn.account?.displayName ?? '',
      replaceTag,
    });
  }, [selectedTxn, onMatch, replaceTag]);

  const batchTooltipContent = isBatch ? (
    <div className="text-xs space-y-0.5 min-w-48">
      {batchTransactions.map((txn) => (
        <div key={txn.id} className="flex justify-between gap-4">
          <span className="truncate" style={{ color: 'var(--monarch-tooltip-text)', opacity: 0.7 }}>
            {decodeHtmlEntities(txn.merchant?.name ?? txn.originalName)}
          </span>
          <span className="tabular-nums shrink-0">{formatAmount(txn.amount)}</span>
        </div>
      ))}
    </div>
  ) : null;

  let title = `Match Refund for "${merchantName}"`;
  let description: ReactNode | undefined =
    `Original: ${formatAmount(transaction.amount)} on ${formatDate(transaction.date)}`;
  if (isAlreadyMatched) {
    title = 'Match Details';
    description = undefined;
  } else if (isBatch) {
    title = 'Match Refund';
    description = (
      <span>
        {'Apply to '}
        <Tooltip content={batchTooltipContent} side="bottom">
          <span
            className="cursor-help"
            style={{
              textDecorationLine: 'underline',
              textDecorationStyle: 'dotted',
              textUnderlineOffset: '3px',
            }}
          >
            {batchCount} selected transactions
          </span>
        </Tooltip>
      </span>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      {...(description == null ? {} : { description })}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          {isAlreadyMatched ? (
            <>
              <CancelButton onClick={onClose}>Close</CancelButton>
              <WarningButton onClick={onUnmatch} disabled={matching}>
                Unmatch
              </WarningButton>
            </>
          ) : (
            <>
              <CancelButton onClick={onClose} />
              {!isBatch && (
                <ModalButton variant="secondary" onClick={onSkip} disabled={matching}>
                  Skip
                </ModalButton>
              )}
              <PrimaryButton
                onClick={handleMatch}
                disabled={!selectedTxn || matching}
                isLoading={matching}
              >
                {isBatch ? `Match All ${batchCount}` : 'Match Selected'}
              </PrimaryButton>
            </>
          )}
        </div>
      }
    >
      {isAlreadyMatched ? (
        <MatchDetailsContent existingMatch={existingMatch} />
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-(--monarch-text-muted)"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or amount..."
              aria-label="Search for refund transactions"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-(--monarch-border) bg-(--monarch-bg-page) text-(--monarch-text-dark) placeholder:text-(--monarch-text-muted) focus:outline-none focus:border-(--monarch-orange) focus:ring-1 focus:ring-(--monarch-orange)/20"
            />
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-(--monarch-border)">
            <SearchResultsList
              searching={searching}
              candidates={refundCandidates}
              searchQuery={searchQuery}
              selectedTxnId={selectedTxnId}
              onSelect={setSelectedTxnId}
              onClearFilters={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              hasNextPage={hasNextPage ?? false}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={fetchNextPage}
              candidateMatchInfo={candidateMatchInfo}
              selectionAmount={selectionAmount}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={replaceTag}
              onChange={(e) => setReplaceTag(e.target.checked)}
              className="rounded border-(--monarch-border) text-(--monarch-orange) focus:ring-(--monarch-orange)"
            />
            <span className="text-sm text-(--monarch-text-dark)">{tagActionLabel}</span>
          </label>
        </div>
      )}
    </Modal>
  );
}
