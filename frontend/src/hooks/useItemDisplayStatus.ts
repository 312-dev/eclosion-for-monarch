/**
 * useItemDisplayStatus Hook
 *
 * Calculates the display status for a recurring item based on
 * budget, target, balance, and amount values.
 *
 * This logic determines what status badge to show the user:
 * - 'ahead': Budgeted more than needed
 * - 'on_track': Budgeted enough for the target
 * - 'funded': Has enough balance to cover the expense
 * - 'behind': Budgeted less than needed
 *
 * Usage:
 *   const displayStatus = useItemDisplayStatus(item);
 */

import { useMemo } from 'react';
import type { RecurringItem, ItemStatus } from '../types';

/**
 * Calculate the display status for a recurring item.
 *
 * Pure function that can be used outside of React components.
 */
export function calculateItemDisplayStatus(item: RecurringItem): ItemStatus {
  const targetRounded = Math.ceil(item.frozen_monthly_target);
  const budgetRounded = Math.ceil(item.planned_budget);
  const balanceRounded = Math.round(item.current_balance);
  const amountRounded = Math.round(item.amount);

  if (item.is_enabled && item.frozen_monthly_target > 0) {
    if (budgetRounded > targetRounded) {
      return 'ahead';
    } else if (budgetRounded >= targetRounded) {
      return balanceRounded >= amountRounded ? 'funded' : 'on_track';
    } else {
      return 'behind';
    }
  } else if (item.is_enabled && balanceRounded >= amountRounded) {
    return 'funded';
  }

  return item.status;
}

/**
 * Hook that returns the calculated display status for a recurring item.
 * Memoized to prevent unnecessary recalculations.
 *
 * @param item - The recurring item to calculate status for
 * @returns The calculated display status
 */
export function useItemDisplayStatus(item: RecurringItem): ItemStatus {
  return useMemo(() => calculateItemDisplayStatus(item), [item]);
}
