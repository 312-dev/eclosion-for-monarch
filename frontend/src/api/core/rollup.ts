/**
 * Rollup API Functions
 *
 * Operations for the rollup category (combined small subscriptions).
 */

import type { RollupData } from '../../types';
import { fetchApi } from './fetchApi';

export async function getRollupData(): Promise<RollupData> {
  return fetchApi<RollupData>('/recurring/rollup');
}

export async function addToRollup(
  recurringId: string
): Promise<{ success: boolean; item_id?: string; monthly_rate?: number; total_budgeted?: number; error?: string }> {
  return fetchApi('/recurring/rollup/add', {
    method: 'POST',
    body: JSON.stringify({ recurring_id: recurringId }),
  });
}

export async function removeFromRollup(
  recurringId: string
): Promise<{ success: boolean; item_id?: string; monthly_rate?: number; total_budgeted?: number; error?: string }> {
  return fetchApi('/recurring/rollup/remove', {
    method: 'POST',
    body: JSON.stringify({ recurring_id: recurringId }),
  });
}

export async function setRollupBudget(
  amount: number
): Promise<{ success: boolean; total_budgeted?: number; error?: string }> {
  return fetchApi('/recurring/rollup/budget', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export async function linkRollupToCategory(
  categoryId: string,
  syncName: boolean = true
): Promise<{
  success: boolean;
  category_id?: string;
  category_name?: string;
  planned_budget?: number;
  is_linked?: boolean;
  error?: string;
}> {
  return fetchApi('/recurring/rollup/link', {
    method: 'POST',
    body: JSON.stringify({ category_id: categoryId, sync_name: syncName }),
  });
}

export async function createRollupCategory(
  budget: number = 0
): Promise<{
  success: boolean;
  category_id?: string;
  category_name?: string;
  budget?: number;
  error?: string;
}> {
  return fetchApi('/recurring/rollup/create', {
    method: 'POST',
    body: JSON.stringify({ budget }),
  });
}

export async function updateRollupEmoji(
  emoji: string
): Promise<{ success: boolean; emoji?: string; new_name?: string; error?: string }> {
  return fetchApi('/recurring/rollup/emoji', {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });
}

export async function updateRollupCategoryName(
  name: string
): Promise<{ success: boolean; category_name?: string; error?: string }> {
  return fetchApi('/recurring/rollup/name', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}
