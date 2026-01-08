/**
 * Demo Item Functions
 *
 * Individual recurring item operations.
 */

import type { AllocateResult } from '../../types';
import { calculateItemDisplayStatus } from '../../hooks/useItemDisplayStatus';
import { getDemoState, updateDemoState, simulateDelay } from './demoState';

/**
 * Calculate the frozen monthly target for a recurring item.
 * Mirrors the logic from services/frozen_target_calculator.py
 */
function calculateFrozenTarget(
  amount: number,
  frequencyMonths: number,
  monthsUntilDue: number,
  currentBalance: number
): number {
  if (frequencyMonths <= 1) {
    // Monthly items: target is the amount (with catch-up if behind)
    const ideal = Math.ceil(amount);
    const shortfall = Math.max(0, ideal - currentBalance);
    if (shortfall > 0) {
      return ideal + Math.ceil(shortfall);
    }
    return ideal;
  } else {
    // Non-monthly items: calculate catch-up rate
    const shortfall = Math.max(0, amount - currentBalance);
    const monthsRemaining = Math.max(1, monthsUntilDue);
    if (shortfall > 0) {
      return Math.ceil(shortfall / monthsRemaining);
    }
    return 0;
  }
}

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
      items: state.dashboard.items.map((item) => {
        if (item.id !== recurringId) return item;

        if (enabled) {
          // Calculate frozen_monthly_target when enabling
          const frozenTarget = calculateFrozenTarget(
            item.amount,
            item.frequency_months,
            item.months_until_due,
            item.current_balance
          );
          return {
            ...item,
            is_enabled: true,
            status: 'on_track' as const,
            frozen_monthly_target: frozenTarget,
          };
        } else {
          // Reset when disabling
          return {
            ...item,
            is_enabled: false,
            status: 'inactive' as const,
            frozen_monthly_target: 0,
          };
        }
      }),
    },
  }));

  return { success: true, enabled };
}

/**
 * Allocate funds to a recurring item.
 *
 * current_balance = rollover (start of month), doesn't change when allocating
 * contributed_this_month = what's been budgeted this month, increases when allocating
 * Total saved = current_balance + contributed_this_month
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

        // current_balance is rollover (doesn't change), only contributed_this_month increases
        const newContributed = item.contributed_this_month + amount;
        const totalSaved = item.current_balance + newContributed;
        const newProgress = Math.min(100, Math.round((totalSaved / item.amount) * 100));

        // Build updated item to calculate status using shared logic
        const updatedItem = {
          ...item,
          contributed_this_month: newContributed,
          planned_budget: item.planned_budget + amount,
        };
        const newStatus = calculateItemDisplayStatus(updatedItem);

        // frozen_monthly_target stays FIXED - it only changes at month boundaries
        return {
          ...updatedItem,
          progress_percent: newProgress,
          status: newStatus,
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
  const totalSaved = (item?.current_balance ?? 0) + (item?.contributed_this_month ?? 0);

  return {
    success: true,
    previous_budget: totalSaved - amount,
    allocated: amount,
    new_budget: totalSaved,
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
