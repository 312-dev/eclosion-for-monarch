/**
 * Match action handlers for the Refunds feature.
 * Extracted from RefundsTab to keep component under 300-line limit.
 */

import { useCallback, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import { handleApiError } from '../../utils';
import {
  useCreateRefundsMatchMutation,
  useDeleteRefundsMatchMutation,
} from '../../api/queries/refundsQueries';
import type { Transaction, RefundsMatch } from '../../types/refunds';

interface MatchHandlersParams {
  readonly matchingTransaction: Transaction | null;
  readonly setMatchingTransaction: (t: Transaction | null) => void;
  readonly matches: RefundsMatch[];
  readonly tagIds: string[];
}

export interface MatchActionParams {
  refundTransactionId: string;
  refundAmount: number;
  refundMerchant: string;
  refundDate: string;
  refundAccount: string;
  replaceTag: boolean;
}

export interface ExpectedRefundParams {
  expectedDate: string;
  expectedAccount: string;
  expectedAccountId: string;
  expectedNote: string;
  expectedAmount: number;
}

export function useRefundsMatchHandlers({
  matchingTransaction,
  setMatchingTransaction,
  matches,
  tagIds,
}: MatchHandlersParams): {
  handleMatch: (params: MatchActionParams) => Promise<void>;
  handleBatchMatchAll: (transactions: Transaction[], params: MatchActionParams) => Promise<void>;
  handleExpectedRefund: (params: ExpectedRefundParams) => Promise<void>;
  handleBatchExpectedRefundAll: (
    transactions: Transaction[],
    params: ExpectedRefundParams
  ) => Promise<void>;
  handleSkip: () => Promise<void>;
  handleUnmatch: () => Promise<void>;
  handleDirectSkip: (transaction: Transaction) => Promise<void>;
  handleDirectUnmatch: (transaction: Transaction) => Promise<void>;
  handleRestore: (transaction: Transaction) => Promise<void>;
  existingMatch: RefundsMatch | undefined;
  matchPending: boolean;
} {
  const toast = useToast();
  const createMatchMutation = useCreateRefundsMatchMutation();
  const deleteMatchMutation = useDeleteRefundsMatchMutation();

  const existingMatch = useMemo(
    () =>
      matchingTransaction
        ? matches.find(
            (m) =>
              m.originalTransactionId === matchingTransaction.id && !m.expectedRefund && !m.skipped
          )
        : undefined,
    [matchingTransaction, matches]
  );

  const handleMatch = useCallback(
    async (params: MatchActionParams) => {
      if (!matchingTransaction) return;
      try {
        // Delete existing expected/skipped match if present
        const existing = matches.find((m) => m.originalTransactionId === matchingTransaction.id);
        if (existing) {
          await deleteMatchMutation.mutateAsync(existing.id);
        }
        await createMatchMutation.mutateAsync({
          originalTransactionId: matchingTransaction.id,
          ...params,
          originalTagIds: matchingTransaction.tags.map((t) => t.id),
          originalNotes: matchingTransaction.notes,
          viewTagIds: tagIds,
          transactionData: matchingTransaction,
        });
        setMatchingTransaction(null);
        toast.success('Refund matched');
      } catch (err) {
        toast.error(handleApiError(err, 'Refunds'));
      }
    },
    [
      matchingTransaction,
      matches,
      createMatchMutation,
      deleteMatchMutation,
      toast,
      tagIds,
      setMatchingTransaction,
    ]
  );

  const handleBatchMatchAll = useCallback(
    async (transactions: Transaction[], params: MatchActionParams) => {
      try {
        for (const txn of transactions) {
          // Delete existing expected/skipped match if present
          const existing = matches.find((m) => m.originalTransactionId === txn.id);
          if (existing) {
            await deleteMatchMutation.mutateAsync(existing.id);
          }
          await createMatchMutation.mutateAsync({
            originalTransactionId: txn.id,
            ...params,
            originalTagIds: txn.tags.map((t) => t.id),
            originalNotes: txn.notes,
            viewTagIds: tagIds,
            transactionData: txn,
          });
        }
        setMatchingTransaction(null);
        toast.success(`Matched ${transactions.length} transactions`);
      } catch (err) {
        toast.error(handleApiError(err, 'Refunds'));
      }
    },
    [createMatchMutation, deleteMatchMutation, matches, toast, tagIds, setMatchingTransaction]
  );

  const handleExpectedRefund = useCallback(
    async (params: ExpectedRefundParams) => {
      if (!matchingTransaction) return;
      try {
        // If transaction already has an expected refund, delete it first
        const existing = matches.find(
          (m) => m.originalTransactionId === matchingTransaction.id && m.expectedRefund
        );
        if (existing) {
          await deleteMatchMutation.mutateAsync(existing.id);
        }
        await createMatchMutation.mutateAsync({
          originalTransactionId: matchingTransaction.id,
          expectedRefund: true,
          ...params,
          originalNotes: matchingTransaction.notes,
          transactionData: matchingTransaction,
        });
        setMatchingTransaction(null);
        toast.success('Expected refund set');
      } catch (err) {
        toast.error(handleApiError(err, 'Refunds'));
      }
    },
    [
      matchingTransaction,
      matches,
      createMatchMutation,
      deleteMatchMutation,
      toast,
      setMatchingTransaction,
    ]
  );

  const handleBatchExpectedRefundAll = useCallback(
    async (transactions: Transaction[], params: ExpectedRefundParams) => {
      try {
        // Delete existing expected matches to avoid duplicates
        for (const txn of transactions) {
          const existing = matches.find(
            (m) => m.originalTransactionId === txn.id && m.expectedRefund
          );
          if (existing) {
            await deleteMatchMutation.mutateAsync(existing.id);
          }
        }

        // Sort most recent first for distribution
        const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
        let remaining = params.expectedAmount;

        for (const txn of sorted) {
          const expense = Math.abs(txn.amount);
          const allocated = Math.min(remaining, expense);
          remaining = Math.max(0, remaining - allocated);

          await createMatchMutation.mutateAsync({
            originalTransactionId: txn.id,
            expectedRefund: true,
            ...params,
            expectedAmount: allocated,
            originalNotes: txn.notes,
            transactionData: txn,
          });
        }
        setMatchingTransaction(null);
        toast.success(`Set expected refund for ${transactions.length} transactions`);
      } catch (err) {
        toast.error(handleApiError(err, 'Refunds'));
      }
    },
    [createMatchMutation, deleteMatchMutation, matches, toast, setMatchingTransaction]
  );

  const handleSkip = useCallback(async () => {
    if (!matchingTransaction) return;
    try {
      await createMatchMutation.mutateAsync({
        originalTransactionId: matchingTransaction.id,
        skipped: true,
        transactionData: matchingTransaction,
      });
      setMatchingTransaction(null);
      toast.info('Transaction skipped');
    } catch (err) {
      toast.error(handleApiError(err, 'Refunds'));
    }
  }, [matchingTransaction, createMatchMutation, toast, setMatchingTransaction]);

  const handleUnmatch = useCallback(async () => {
    if (!existingMatch) return;
    try {
      await deleteMatchMutation.mutateAsync(existingMatch.id);
      setMatchingTransaction(null);
      const tagNames = existingMatch.transactionData?.tags.map((t) => t.name);
      const suffix = tagNames?.length ? ` — tags restored: ${tagNames.join(', ')}` : '';
      toast.success(`Match removed${suffix}`);
    } catch (err) {
      toast.error(handleApiError(err, 'Refunds'));
    }
  }, [existingMatch, deleteMatchMutation, toast, setMatchingTransaction]);

  const handleDirectSkip = useCallback(
    async (transaction: Transaction) => {
      try {
        await createMatchMutation.mutateAsync({
          originalTransactionId: transaction.id,
          skipped: true,
          transactionData: transaction,
        });
        toast.info('Transaction skipped');
      } catch (err) {
        toast.error(handleApiError(err, 'Refunds'));
      }
    },
    [createMatchMutation, toast]
  );

  const handleDirectUnmatch = useCallback(
    async (transaction: Transaction) => {
      const matchToDelete = matches.find((m) => m.originalTransactionId === transaction.id);
      if (!matchToDelete) return;
      try {
        await deleteMatchMutation.mutateAsync(matchToDelete.id);
      } catch (err) {
        toast.error(handleApiError(err, 'Refunds'));
      }
    },
    [matches, deleteMatchMutation, toast]
  );

  const handleRestore = useCallback(
    async (transaction: Transaction) => {
      const matchToDelete = matches.find((m) => m.originalTransactionId === transaction.id);
      if (!matchToDelete) return;
      try {
        await deleteMatchMutation.mutateAsync(matchToDelete.id);
        const tagNames = matchToDelete.transactionData?.tags.map((t) => t.name);
        const suffix = tagNames?.length ? ` — tags restored: ${tagNames.join(', ')}` : '';
        toast.success(`Transaction restored${suffix}`);
      } catch (err) {
        toast.error(handleApiError(err, 'Refunds'));
      }
    },
    [matches, deleteMatchMutation, toast]
  );

  return {
    handleMatch,
    handleBatchMatchAll,
    handleExpectedRefund,
    handleBatchExpectedRefundAll,
    handleSkip,
    handleUnmatch,
    handleDirectSkip,
    handleDirectUnmatch,
    handleRestore,
    existingMatch,
    matchPending: createMatchMutation.isPending || deleteMatchMutation.isPending,
  };
}
