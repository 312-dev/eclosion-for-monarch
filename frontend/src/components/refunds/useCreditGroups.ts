/**
 * useCreditGroups
 *
 * Groups refund matches into CreditGroup objects for display as expandable
 * credit rows in the transaction list. Produces two kinds of groups:
 * - Actual refunds: grouped by refundTransactionId
 * - Expected refunds: grouped by (expectedDate, expectedAccountId)
 */

import { useMemo } from 'react';
import type { Transaction, RefundsMatch, CreditGroup } from '../../types/refunds';

function groupMatchesBy(
  matches: RefundsMatch[],
  filter: (m: RefundsMatch) => boolean,
  keyFn: (m: RefundsMatch) => string | null
): Map<string, RefundsMatch[]> {
  const groups = new Map<string, RefundsMatch[]>();
  for (const m of matches) {
    if (!filter(m)) continue;
    const key = keyFn(m);
    if (!key) continue;
    const existing = groups.get(key);
    if (existing) {
      existing.push(m);
    } else {
      groups.set(key, [m]);
    }
  }
  return groups;
}

function sumOriginalAmounts(matchGroup: RefundsMatch[], txnMap: Map<string, Transaction>): number {
  return matchGroup.reduce((sum, m) => {
    const txn = txnMap.get(m.originalTransactionId);
    return sum + (txn ? Math.abs(txn.amount) : 0);
  }, 0);
}

function buildRefundGroups(
  matches: RefundsMatch[],
  txnMap: Map<string, Transaction>
): CreditGroup[] {
  const grouped = groupMatchesBy(
    matches,
    (m) => !m.skipped && !m.expectedRefund && m.refundTransactionId != null,
    (m) => m.refundTransactionId
  );
  const groups: CreditGroup[] = [];
  for (const [refundTxnId, matchGroup] of grouped) {
    const first = matchGroup[0] as RefundsMatch;
    const refundAmount = first.refundAmount ?? 0;
    const totalOriginal = sumOriginalAmounts(matchGroup, txnMap);
    groups.push({
      id: refundTxnId,
      type: 'refund',
      date: first.refundDate ?? new Date().toISOString().slice(0, 10),
      amount: refundAmount,
      merchant: first.refundMerchant,
      account: first.refundAccount,
      note: null,
      originalTransactionIds: matchGroup.map((m) => m.originalTransactionId),
      remaining: Math.max(0, totalOriginal - refundAmount),
    });
  }
  return groups;
}

function buildExpectedGroups(
  matches: RefundsMatch[],
  txnMap: Map<string, Transaction>
): CreditGroup[] {
  const grouped = groupMatchesBy(
    matches,
    (m) => !m.skipped && m.expectedRefund,
    (m) => `${m.expectedDate ?? 'none'}-${m.expectedAccountId ?? 'none'}`
  );
  const groups: CreditGroup[] = [];
  for (const [key, matchGroup] of grouped) {
    const first = matchGroup[0] as RefundsMatch;
    const totalExpected = matchGroup.reduce((sum, m) => {
      const txn = txnMap.get(m.originalTransactionId);
      return sum + Math.abs(m.expectedAmount ?? txn?.amount ?? 0);
    }, 0);
    const totalOriginal = sumOriginalAmounts(matchGroup, txnMap);
    groups.push({
      id: `expected-${key}`,
      type: 'expected',
      date: first.expectedDate ?? new Date().toISOString().slice(0, 10),
      amount: totalExpected,
      merchant: null,
      account: first.expectedAccount,
      note: first.expectedNote,
      originalTransactionIds: matchGroup.map((m) => m.originalTransactionId),
      remaining: Math.max(0, totalOriginal - totalExpected),
    });
  }
  return groups;
}

export function useCreditGroups(
  matches: RefundsMatch[],
  transactions: Transaction[]
): CreditGroup[] {
  return useMemo(() => {
    const txnMap = new Map<string, Transaction>();
    for (const txn of transactions) {
      txnMap.set(txn.id, txn);
    }

    const groups = [...buildRefundGroups(matches, txnMap), ...buildExpectedGroups(matches, txnMap)];
    groups.sort((a, b) => b.date.localeCompare(a.date));
    return groups;
  }, [matches, transactions]);
}
