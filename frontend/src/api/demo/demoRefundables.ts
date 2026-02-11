/**
 * Demo Refundables API
 *
 * localStorage-based implementation of the Refundables API for demo mode.
 */

import type {
  RefundablesConfig,
  RefundablesMatch,
  RefundablesSavedView,
  Transaction,
  TransactionTag,
  CreateMatchRequest,
} from '../../types/refundables';
import { getDemoState, updateDemoState } from './demoState';
import { DEMO_TAGS, DEMO_TRANSACTIONS, DEMO_REFUND_TRANSACTIONS } from './demoRefundablesData';

const DEMO_DELAY = 200;
const simulateDelay = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, DEMO_DELAY));

// ---- Config ----

export async function getRefundablesConfig(): Promise<RefundablesConfig> {
  await simulateDelay();
  return getDemoState().refundablesConfig;
}

export async function updateRefundablesConfig(
  updates: Partial<RefundablesConfig>
): Promise<{ success: boolean }> {
  await simulateDelay();
  updateDemoState((state) => ({
    ...state,
    refundablesConfig: { ...state.refundablesConfig, ...updates },
  }));
  return { success: true };
}

// ---- Tags ----

export async function getRefundablesTags(): Promise<TransactionTag[]> {
  await simulateDelay();
  return DEMO_TAGS;
}

// ---- Views ----

export async function getRefundablesViews(): Promise<RefundablesSavedView[]> {
  await simulateDelay();
  return getDemoState().refundablesViews;
}

export async function createRefundablesView(
  name: string,
  tagIds: string[],
  categoryIds: string[] | null
): Promise<RefundablesSavedView> {
  await simulateDelay();
  const views = getDemoState().refundablesViews;
  const newView: RefundablesSavedView = {
    id: crypto.randomUUID(),
    name,
    tagIds,
    categoryIds,
    sortOrder: views.length,
  };
  updateDemoState((state) => ({
    ...state,
    refundablesViews: [...state.refundablesViews, newView],
  }));
  return newView;
}

export async function updateRefundablesView(
  viewId: string,
  updates: Partial<Pick<RefundablesSavedView, 'name' | 'tagIds' | 'categoryIds' | 'sortOrder'>>
): Promise<{ success: boolean }> {
  await simulateDelay();
  updateDemoState((state) => ({
    ...state,
    refundablesViews: state.refundablesViews.map((v) =>
      v.id === viewId ? { ...v, ...updates } : v
    ),
  }));
  return { success: true };
}

export async function deleteRefundablesView(viewId: string): Promise<{ success: boolean }> {
  await simulateDelay();
  updateDemoState((state) => ({
    ...state,
    refundablesViews: state.refundablesViews.filter((v) => v.id !== viewId),
  }));
  return { success: true };
}

export async function reorderRefundablesViews(viewIds: string[]): Promise<{ success: boolean }> {
  await simulateDelay();
  updateDemoState((state) => ({
    ...state,
    refundablesViews: viewIds
      .map((id, i) => {
        const view = state.refundablesViews.find((v) => v.id === id);
        return view ? { ...view, sortOrder: i } : null;
      })
      .filter((v): v is RefundablesSavedView => v !== null),
  }));
  return { success: true };
}

// ---- Transactions ----

export async function getRefundablesTransactions(
  tagIds: string[],
  _startDate?: string | null,
  _endDate?: string | null,
  categoryIds?: string[] | null
): Promise<Transaction[]> {
  await simulateDelay();
  const overrides = getDemoState().refundablesTransactionTagOverrides ?? {};

  // Apply tag overrides then filter by requested tag IDs and/or category IDs
  const withOverrides = DEMO_TRANSACTIONS.map((txn) => {
    const overriddenTagIds = overrides[txn.id];
    if (!overriddenTagIds) return txn;
    return { ...txn, tags: DEMO_TAGS.filter((t) => overriddenTagIds.includes(t.id)) };
  });

  const hasTags = tagIds.length > 0;
  const catIdSet = categoryIds != null && categoryIds.length > 0 ? new Set(categoryIds) : null;

  return withOverrides.filter((txn) => {
    if (hasTags && !txn.tags.some((tag) => tagIds.includes(tag.id))) return false;
    if (catIdSet && !(txn.category != null && catIdSet.has(txn.category.id))) return false;
    return true;
  });
}

export async function searchRefundablesTransactions(
  search: string,
  _startDate?: string | null,
  _endDate?: string | null,
  limit: number = 10,
  cursor: number = 0
): Promise<{ transactions: Transaction[]; nextCursor: number | null }> {
  await simulateDelay();
  const all = [...DEMO_REFUND_TRANSACTIONS, ...DEMO_TRANSACTIONS].filter((txn) => txn.amount > 0);
  const query = search.toLowerCase().trim();
  const filtered = query
    ? all.filter(
        (txn) =>
          txn.merchant?.name.toLowerCase().includes(query) ||
          txn.originalName.toLowerCase().includes(query) ||
          Math.abs(txn.amount).toFixed(2).includes(query)
      )
    : all;
  const page = filtered.slice(cursor, cursor + limit);
  const nextCursor = cursor + limit < filtered.length ? cursor + limit : null;
  return { transactions: page, nextCursor };
}

// ---- Pending Count ----

export async function getRefundablesPendingCount(): Promise<{
  count: number;
  viewCounts: Record<string, number>;
}> {
  await simulateDelay();
  const state = getDemoState();
  const views = state.refundablesViews;
  if (views.length === 0) return { count: 0, viewCounts: {} };

  const overrides = state.refundablesTransactionTagOverrides ?? {};
  const matchedIds = new Set(state.refundablesMatches.map((m) => m.originalTransactionId));

  // Apply tag overrides
  const withOverrides = DEMO_TRANSACTIONS.map((txn) => {
    const overriddenTagIds = overrides[txn.id];
    if (!overriddenTagIds) return txn;
    return { ...txn, tags: DEMO_TAGS.filter((t) => overriddenTagIds.includes(t.id)) };
  });

  // Only expenses, unmatched
  const unmatchedExpenses = withOverrides.filter(
    (txn) => txn.amount < 0 && !matchedIds.has(txn.id)
  );

  // Per-view counts
  const viewCounts: Record<string, number> = {};
  const globalIds = new Set<string>();
  for (const view of views) {
    const tagSet = new Set(view.tagIds);
    let count = 0;
    for (const txn of unmatchedExpenses) {
      if (txn.tags.some((tag) => tagSet.has(tag.id))) {
        count++;
        globalIds.add(txn.id);
      }
    }
    viewCounts[view.id] = count;
  }

  return { count: globalIds.size, viewCounts };
}

// ---- Matches ----

export async function getRefundablesMatches(): Promise<RefundablesMatch[]> {
  await simulateDelay();
  return getDemoState().refundablesMatches;
}

export async function createRefundablesMatch(
  request: CreateMatchRequest
): Promise<{ success: boolean }> {
  await simulateDelay();
  const newMatch: RefundablesMatch = {
    id: crypto.randomUUID(),
    originalTransactionId: request.originalTransactionId,
    refundTransactionId: request.refundTransactionId ?? null,
    refundAmount: request.refundAmount ?? null,
    refundMerchant: request.refundMerchant ?? null,
    refundDate: request.refundDate ?? null,
    refundAccount: request.refundAccount ?? null,
    skipped: request.skipped ?? false,
    transactionData: request.transactionData ?? null,
  };
  updateDemoState((state) => {
    const updated = { ...state, refundablesMatches: [...state.refundablesMatches, newMatch] };

    // Simulate view-scoped tag replacement
    if (request.replaceTag && request.originalTagIds) {
      const tagsToRemove = new Set(request.viewTagIds ?? request.originalTagIds);
      const newTagIds = request.originalTagIds.filter((tid) => !tagsToRemove.has(tid));
      const { replacementTagId } = state.refundablesConfig;
      if (replacementTagId && !newTagIds.includes(replacementTagId)) {
        newTagIds.push(replacementTagId);
      }
      updated.refundablesTransactionTagOverrides = {
        ...state.refundablesTransactionTagOverrides,
        [request.originalTransactionId]: newTagIds,
      };
    }

    return updated;
  });
  return { success: true };
}

export async function deleteRefundablesMatch(matchId: string): Promise<{ success: boolean }> {
  await simulateDelay();
  updateDemoState((state) => {
    const match = state.refundablesMatches.find((m) => m.id === matchId);
    const updated = {
      ...state,
      refundablesMatches: state.refundablesMatches.filter((m) => m.id !== matchId),
    };

    // Restore original tags by removing the override (reverts to hardcoded tags)
    if (match) {
      const overrides = { ...state.refundablesTransactionTagOverrides };
      delete overrides[match.originalTransactionId];
      updated.refundablesTransactionTagOverrides = overrides;
    }

    return updated;
  });
  return { success: true };
}
