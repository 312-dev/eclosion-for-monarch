/**
 * Item API Functions
 *
 * Individual recurring item operations.
 */

import type { AllocateResult } from '../../types';
import { fetchApi } from './fetchApi';

export async function toggleItemTracking(
  recurringId: string,
  enabled: boolean,
  options?: { initialBudget?: number; itemData?: Record<string, unknown> }
): Promise<{ success: boolean; enabled: boolean }> {
  return fetchApi('/recurring/toggle', {
    method: 'POST',
    body: JSON.stringify({
      recurring_id: recurringId,
      enabled,
      initial_budget: options?.initialBudget,
      item_data: options?.itemData,
    }),
  });
}

export async function allocateFunds(
  recurringId: string,
  amount: number
): Promise<AllocateResult> {
  return fetchApi<AllocateResult>('/recurring/allocate', {
    method: 'POST',
    body: JSON.stringify({ recurring_id: recurringId, amount }),
  });
}

export async function recreateCategory(
  recurringId: string
): Promise<{ success: boolean; category_id?: string; error?: string }> {
  return fetchApi('/recurring/recreate-category', {
    method: 'POST',
    body: JSON.stringify({ recurring_id: recurringId }),
  });
}

export async function refreshItem(recurringId: string): Promise<{ success: boolean }> {
  return fetchApi('/recurring/refresh-item', {
    method: 'POST',
    body: JSON.stringify({ recurring_id: recurringId }),
  });
}

export async function changeCategoryGroup(
  recurringId: string,
  groupId: string,
  groupName: string
): Promise<{ success: boolean; error?: string }> {
  return fetchApi('/recurring/change-group', {
    method: 'POST',
    body: JSON.stringify({
      recurring_id: recurringId,
      group_id: groupId,
      group_name: groupName,
    }),
  });
}
