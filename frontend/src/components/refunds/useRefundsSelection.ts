/**
 * Selection-derived state and batch action handlers for the Refunds feature.
 * Extracted from RefundsTab to keep component under 300-line limit.
 *
 * Selection ID state (useState) is owned by the parent; this hook computes
 * derived values and action handlers from it.
 */

import { useMemo, useCallback, useRef } from 'react';
import type { Transaction, RefundsMatch } from '../../types/refunds';

export type SelectionState = 'unmatched' | 'matched' | 'skipped' | 'expected' | 'mixed';

interface SelectionParams {
  readonly selectedIds: Set<string>;
  readonly setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  readonly activeTransactions: Transaction[];
  readonly skippedTransactions: Transaction[];
  readonly matches: RefundsMatch[];
  readonly handleDirectSkip: (transaction: Transaction) => Promise<void>;
  readonly handleDirectUnmatch: (transaction: Transaction) => Promise<void>;
  readonly handleRestore: (transaction: Transaction) => Promise<void>;
}

interface SelectionActions {
  selectedAmount: number;
  selectionState: SelectionState;
  handleToggleSelect: (transaction: Transaction, shiftKey: boolean) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleBatchSkip: () => Promise<void>;
  handleBatchUnmatch: () => Promise<void>;
  handleBatchRestore: () => Promise<void>;
  handleBatchClearExpected: () => Promise<void>;
  clearSelection: () => void;
}

function classifyTransaction(
  match: RefundsMatch | undefined
): 'unmatched' | 'matched' | 'expected' {
  if (match?.expectedRefund) return 'expected';
  if (match && !match.skipped) return 'matched';
  return 'unmatched';
}

export function useRefundsSelection({
  selectedIds,
  setSelectedIds,
  activeTransactions,
  skippedTransactions,
  matches,
  handleDirectSkip,
  handleDirectUnmatch,
  handleRestore,
}: SelectionParams): SelectionActions {
  const allVisibleTransactions = useMemo(
    () => [...activeTransactions, ...skippedTransactions],
    [activeTransactions, skippedTransactions]
  );

  const selectedAmount = useMemo(() => {
    let sum = 0;
    for (const txn of allVisibleTransactions) {
      if (selectedIds.has(txn.id)) sum += Math.abs(txn.amount);
    }
    return sum;
  }, [allVisibleTransactions, selectedIds]);

  const selectionState: SelectionState = useMemo(() => {
    if (selectedIds.size === 0) return 'unmatched';
    const flags = { unmatched: false, matched: false, skipped: false, expected: false };
    for (const txn of activeTransactions) {
      if (!selectedIds.has(txn.id)) continue;
      const match = matches.find((m) => m.originalTransactionId === txn.id);
      const cls = classifyTransaction(match);
      flags[cls] = true;
    }
    for (const txn of skippedTransactions) {
      if (selectedIds.has(txn.id)) flags.skipped = true;
    }
    const count = Object.values(flags).filter(Boolean).length;
    if (count > 1) return 'mixed';
    if (flags.expected) return 'expected';
    if (flags.matched) return 'matched';
    if (flags.skipped) return 'skipped';
    return 'unmatched';
  }, [selectedIds, activeTransactions, skippedTransactions, matches]);

  const lastClickedIdRef = useRef<string | null>(null);

  const handleToggleSelect = useCallback(
    (transaction: Transaction, shiftKey: boolean) => {
      if (shiftKey && lastClickedIdRef.current) {
        const anchorIdx = allVisibleTransactions.findIndex(
          (t) => t.id === lastClickedIdRef.current
        );
        const targetIdx = allVisibleTransactions.findIndex((t) => t.id === transaction.id);
        if (anchorIdx !== -1 && targetIdx !== -1) {
          const start = Math.min(anchorIdx, targetIdx);
          const end = Math.max(anchorIdx, targetIdx);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            for (let i = start; i <= end; i++) {
              next.add(allVisibleTransactions[i]!.id);
            }
            return next;
          });
          return;
        }
      }
      lastClickedIdRef.current = transaction.id;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(transaction.id)) {
          next.delete(transaction.id);
        } else {
          next.add(transaction.id);
        }
        return next;
      });
    },
    [setSelectedIds, allVisibleTransactions]
  );

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(allVisibleTransactions.map((t) => t.id)));
  }, [setSelectedIds, allVisibleTransactions]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
    lastClickedIdRef.current = null;
  }, [setSelectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastClickedIdRef.current = null;
  }, [setSelectedIds]);

  const handleBatchSkip = useCallback(async () => {
    const toSkip = activeTransactions.filter((txn) => selectedIds.has(txn.id));
    for (const txn of toSkip) {
      await handleDirectSkip(txn);
    }
    setSelectedIds(new Set());
  }, [activeTransactions, selectedIds, handleDirectSkip, setSelectedIds]);

  const handleBatchUnmatch = useCallback(async () => {
    const toUnmatch = activeTransactions.filter((txn) => selectedIds.has(txn.id));
    for (const txn of toUnmatch) {
      await handleDirectUnmatch(txn);
    }
    setSelectedIds(new Set());
  }, [activeTransactions, selectedIds, handleDirectUnmatch, setSelectedIds]);

  const handleBatchRestore = useCallback(async () => {
    const toRestore = skippedTransactions.filter((txn) => selectedIds.has(txn.id));
    for (const txn of toRestore) {
      await handleRestore(txn);
    }
    setSelectedIds(new Set());
  }, [skippedTransactions, selectedIds, handleRestore, setSelectedIds]);

  const handleBatchClearExpected = useCallback(async () => {
    const toClear = activeTransactions.filter((txn) => selectedIds.has(txn.id));
    for (const txn of toClear) {
      await handleDirectUnmatch(txn);
    }
    setSelectedIds(new Set());
  }, [activeTransactions, selectedIds, handleDirectUnmatch, setSelectedIds]);

  return {
    selectedAmount,
    selectionState,
    handleToggleSelect,
    handleSelectAll,
    handleDeselectAll,
    handleBatchSkip,
    handleBatchUnmatch,
    handleBatchRestore,
    handleBatchClearExpected,
    clearSelection,
  };
}
