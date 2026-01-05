/**
 * Demo Item Functions
 *
 * Individual recurring item operations.
 */

import type { AllocateResult } from '../../types';
import { getDemoState, updateDemoState, simulateDelay } from './demoState';

/**
 * Toggle tracking for a recurring item.
 */
export async function toggleItemTracking(
  recurringId: string,
  enabled: boolean,
  _options?: { initialBudget?: number; itemData?: Record<string, unknown> }
): Promise<{ success: boolean; enabled: boolean }> {
  await simulateDelay(150);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      items: state.dashboard.items.map((item) =>
        item.id === recurringId
          ? { ...item, is_enabled: enabled, status: enabled ? 'on_track' : 'inactive' }
          : item
      ),
    },
  }));

  return { success: true, enabled };
}

/**
 * Allocate funds to a recurring item.
 */
export async function allocateFunds(
  recurringId: string,
  amount: number
): Promise<AllocateResult> {
  await simulateDelay(200);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      items: state.dashboard.items.map((item) => {
        if (item.id !== recurringId) return item;

        const newBalance = item.current_balance + amount;
        const newProgress = Math.min(100, Math.round((newBalance / item.amount) * 100));
        const newStatus = newBalance >= item.amount ? 'funded' :
                         newProgress >= 80 ? 'on_track' : 'behind';

        return {
          ...item,
          current_balance: newBalance,
          progress_percent: newProgress,
          status: newStatus,
          contributed_this_month: item.contributed_this_month + amount,
        };
      }),
      ready_to_assign: {
        ...state.dashboard.ready_to_assign,
        ready_to_assign: state.dashboard.ready_to_assign.ready_to_assign - amount,
      },
    },
  }));

  const state = getDemoState();
  const item = state.dashboard.items.find((i) => i.id === recurringId);

  return {
    success: true,
    previous_budget: (item?.current_balance ?? 0) - amount,
    allocated: amount,
    new_budget: item?.current_balance ?? 0,
  };
}

/**
 * Recreate a missing category for a recurring item.
 */
export async function recreateCategory(
  recurringId: string
): Promise<{ success: boolean; category_id?: string; error?: string }> {
  await simulateDelay(200);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      items: state.dashboard.items.map((item) =>
        item.id === recurringId ? { ...item, category_missing: false } : item
      ),
    },
  }));

  return { success: true, category_id: `cat-${recurringId}` };
}

/**
 * Refresh a recurring item from Monarch.
 */
export async function refreshItem(
  _recurringId: string
): Promise<{ success: boolean }> {
  await simulateDelay(150);
  return { success: true };
}

/**
 * Change the category group for a recurring item.
 */
export async function changeCategoryGroup(
  recurringId: string,
  _groupId: string,
  groupName: string
): Promise<{ success: boolean; error?: string }> {
  await simulateDelay(150);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      items: state.dashboard.items.map((item) =>
        item.id === recurringId
          ? { ...item, category_group_name: groupName }
          : item
      ),
    },
  }));

  return { success: true };
}
