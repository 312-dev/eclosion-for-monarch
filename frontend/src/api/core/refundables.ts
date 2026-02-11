/**
 * Refundables API
 *
 * API functions for the Refundables feature - tracking purchases
 * awaiting refunds/reimbursements.
 */

import type {
  RefundablesConfig,
  RefundablesMatch,
  RefundablesSavedView,
  Transaction,
  TransactionTag,
  CreateMatchRequest,
} from '../../types/refundables';

import { fetchApi } from './fetchApi';

// ---- Config ----

export async function getRefundablesConfig(): Promise<RefundablesConfig> {
  return fetchApi<RefundablesConfig>('/refundables/config');
}

export async function updateRefundablesConfig(
  updates: Partial<RefundablesConfig>
): Promise<{ success: boolean }> {
  return fetchApi('/refundables/config', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// ---- Tags ----

export async function getRefundablesTags(): Promise<TransactionTag[]> {
  const result = await fetchApi<{ tags: TransactionTag[] }>('/refundables/tags');
  return result.tags;
}

// ---- Saved Views ----

export async function getRefundablesViews(): Promise<RefundablesSavedView[]> {
  const result = await fetchApi<{ views: RefundablesSavedView[] }>('/refundables/views');
  return result.views;
}

export async function createRefundablesView(
  name: string,
  tagIds: string[],
  categoryIds: string[] | null
): Promise<RefundablesSavedView> {
  return fetchApi<RefundablesSavedView>('/refundables/views', {
    method: 'POST',
    body: JSON.stringify({ name, tagIds, categoryIds }),
  });
}

export async function updateRefundablesView(
  viewId: string,
  updates: Partial<Pick<RefundablesSavedView, 'name' | 'tagIds' | 'categoryIds' | 'sortOrder'>>
): Promise<{ success: boolean }> {
  return fetchApi(`/refundables/views/${viewId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteRefundablesView(viewId: string): Promise<{ success: boolean }> {
  return fetchApi(`/refundables/views/${viewId}`, {
    method: 'DELETE',
  });
}

export async function reorderRefundablesViews(viewIds: string[]): Promise<{ success: boolean }> {
  return fetchApi('/refundables/views/reorder', {
    method: 'POST',
    body: JSON.stringify({ viewIds }),
  });
}

// ---- Transactions ----

export async function getRefundablesTransactions(
  tagIds: string[],
  startDate?: string | null,
  endDate?: string | null,
  categoryIds?: string[] | null
): Promise<Transaction[]> {
  const result = await fetchApi<{ transactions: Transaction[] }>('/refundables/transactions', {
    method: 'POST',
    body: JSON.stringify({ tagIds, startDate, endDate, categoryIds }),
  });
  return result.transactions;
}

export interface SearchRefundablesResult {
  transactions: Transaction[];
  nextCursor: number | null;
}

export async function searchRefundablesTransactions(
  search: string,
  startDate?: string | null,
  endDate?: string | null,
  limit?: number,
  cursor?: number
): Promise<SearchRefundablesResult> {
  return fetchApi<SearchRefundablesResult>('/refundables/search', {
    method: 'POST',
    body: JSON.stringify({ search: search || undefined, startDate, endDate, limit, cursor }),
  });
}

// ---- Pending Count ----

export async function getRefundablesPendingCount(): Promise<{
  count: number;
  viewCounts: Record<string, number>;
}> {
  return fetchApi('/refundables/pending-count');
}

// ---- Matches ----

export async function getRefundablesMatches(): Promise<RefundablesMatch[]> {
  const result = await fetchApi<{ matches: RefundablesMatch[] }>('/refundables/matches');
  return result.matches;
}

export async function createRefundablesMatch(
  request: CreateMatchRequest
): Promise<{ success: boolean }> {
  return fetchApi('/refundables/match', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function deleteRefundablesMatch(matchId: string): Promise<{ success: boolean }> {
  return fetchApi(`/refundables/match/${matchId}`, {
    method: 'DELETE',
  });
}
