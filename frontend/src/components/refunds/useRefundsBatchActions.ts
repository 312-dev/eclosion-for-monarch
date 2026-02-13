/**
 * useRefundsBatchActions
 *
 * Manages batch-match, batch-export, and related handlers for the RefundsTab.
 */

import { useMemo, useCallback } from 'react';
import { buildRefundsExportHtml, printHtml } from '../../utils/refundsExport';
import type { MatchActionParams } from './useRefundsMatchHandlers';
import type { Transaction, RefundsMatch, CreditGroup } from '../../types/refunds';

interface BatchActionsParams {
  readonly selectedIds: Set<string>;
  readonly setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  readonly activeTransactions: Transaction[];
  readonly skippedTransactions: Transaction[];
  readonly matches: RefundsMatch[];
  readonly creditGroups: CreditGroup[];
  readonly allTransactions: Transaction[];
  readonly handleBatchMatchAll: (
    transactions: Transaction[],
    params: MatchActionParams
  ) => Promise<void>;
  readonly setMatchingTransaction: (txn: Transaction | null) => void;
  readonly setBatchCount: (n: number) => void;
}

interface BatchActions {
  batchTransactions: Transaction[];
  selectedSkippedTransactions: Transaction[];
  handleExport: () => void;
  handleStartBatchMatch: () => void;
  handleModalBatchMatch: (params: MatchActionParams) => Promise<void>;
  handleCloseMatch: () => void;
}

export function useRefundsBatchActions({
  selectedIds,
  setSelectedIds,
  activeTransactions,
  skippedTransactions,
  matches,
  creditGroups,
  allTransactions,
  handleBatchMatchAll,
  setMatchingTransaction,
  setBatchCount,
}: BatchActionsParams): BatchActions {
  const batchTransactions = useMemo(() => {
    // Include directly selected transactions
    const byId = new Map<string, Transaction>();
    for (const txn of activeTransactions) {
      if (selectedIds.has(txn.id)) byId.set(txn.id, txn);
    }
    // Resolve selected credit groups to their original transactions
    // Use allTransactions as source since activeTransactions may hide expected/matched rows
    for (const cg of creditGroups) {
      if (!selectedIds.has(cg.id)) continue;
      for (const origId of cg.originalTransactionIds) {
        if (byId.has(origId)) continue;
        const txn = allTransactions.find((t) => t.id === origId);
        if (txn) byId.set(txn.id, txn);
      }
    }
    return [...byId.values()];
  }, [activeTransactions, allTransactions, creditGroups, selectedIds]);
  const selectedSkippedTransactions = useMemo(
    () => skippedTransactions.filter((txn) => selectedIds.has(txn.id)),
    [skippedTransactions, selectedIds]
  );

  const handleExport = useCallback(() => {
    const allSelected = [...batchTransactions, ...selectedSkippedTransactions];
    if (allSelected.length === 0) return;
    printHtml(buildRefundsExportHtml(allSelected, matches, creditGroups, allTransactions));
  }, [batchTransactions, selectedSkippedTransactions, matches, creditGroups, allTransactions]);

  const handleStartBatchMatch = useCallback(() => {
    const first = batchTransactions[0];
    if (!first) return;
    setBatchCount(batchTransactions.length);
    setMatchingTransaction(first);
  }, [batchTransactions, setBatchCount, setMatchingTransaction]);

  const handleModalBatchMatch = useCallback(
    async (params: MatchActionParams) => {
      await handleBatchMatchAll(batchTransactions, params);
      setBatchCount(0);
      setSelectedIds(new Set());
    },
    [batchTransactions, handleBatchMatchAll, setBatchCount, setSelectedIds]
  );

  const handleCloseMatch = useCallback(() => {
    setMatchingTransaction(null);
    setBatchCount(0);
  }, [setMatchingTransaction, setBatchCount]);

  return {
    batchTransactions,
    selectedSkippedTransactions,
    handleExport,
    handleStartBatchMatch,
    handleModalBatchMatch,
    handleCloseMatch,
  };
}
