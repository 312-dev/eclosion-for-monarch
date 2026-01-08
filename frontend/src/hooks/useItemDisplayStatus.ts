/**
 * useItemDisplayStatus Hook
 *
 * Calculates the display status for a recurring item based on
 * budget vs target comparison.
 *
 * ## Status Logic
 *
 * - `budget > target` → **Ahead**: Budgeting more than needed
 * - `budget >= target` → **On Track** (or **Funded** if balance covers expense)
 * - `budget < target` → **Behind**: Budgeting less than needed
 *
 * ## Key Concepts
 *
 * ### Effective Target
 * The "effective target" is the monthly amount the user should budget:
 *
 * - **Monthly expenses** (frequency_months <= 1): Effective target = frozen_monthly_target
 *   - Even when this month's bill is covered, next month's bill is coming
 *   - Users must keep budgeting to stay on track
 *
 * - **Infrequent expenses** (quarterly, yearly, etc.): When funded, effective target = $0
 *   - Once you've saved enough, you can stop budgeting until the expense resets
 *   - Budgeting anything above $0 when funded means you're "ahead"
 *
 * ### Why No Trajectory Check?
 *
 * The frozen monthly target already accounts for current balance at month start.
 * - If user over-contributed → next month's target will be lower (or $0)
 * - If user under-contributed → target stays the same (catch-up continues)
 * - The target IS the trajectory - no extra projection needed.
 *
 * ## Examples
 *
 * | Expense | Balance | Budget | Target | Status |
 * |---------|---------|--------|--------|--------|
 * | $600/yr | $300    | $75    | $50    | Ahead  |
 * | $600/yr | $300    | $50    | $50    | On Track |
 * | $600/yr | $300    | $30    | $50    | Behind |
 * | $600/yr | $600    | $50    | $0     | Ahead (target dropped to $0 when funded) |
 * | $600/yr | $600    | $0     | $0     | Funded |
 * | $80/mo  | $80     | $100   | $80    | Ahead |
 * | $80/mo  | $80     | $80    | $80    | Funded |
 * | $80/mo  | $80     | $50    | $80    | Behind |
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
 *
 * Logic: Simple budget-vs-target comparison.
 * - For infrequent expenses (quarterly, yearly): When funded, effective target becomes $0
 * - For monthly expenses: Keep budgeting even when funded (next month's bill is coming)
 */
export function calculateItemDisplayStatus(item: RecurringItem): ItemStatus {
  const targetRounded = Math.ceil(item.frozen_monthly_target);
  const budgetRounded = Math.ceil(item.planned_budget);
  // Total saved = current_balance (rollover) + contributed_this_month
  const balanceRounded = Math.round(item.current_balance + item.contributed_this_month);
  const amountRounded = Math.round(item.amount);
  const isFunded = balanceRounded >= amountRounded;
  const isMonthlyOrMoreFrequent = item.frequency_months <= 1;

  // Item is disabled - use backend status
  if (!item.is_enabled) {
    return item.status;
  }

  // No target configured yet - fall back to backend status (unless funded)
  if (item.frozen_monthly_target <= 0) {
    if (isFunded) return 'funded';
    return item.status;
  }

  // Calculate effective target based on funding status and frequency
  // - Monthly expenses: Always use the target (need to keep saving for next month)
  // - Infrequent expenses: When funded, target becomes $0 (done saving until reset)
  const effectiveTarget = (isFunded && !isMonthlyOrMoreFrequent) ? 0 : targetRounded;

  // Budgeting more than needed
  if (budgetRounded > effectiveTarget) return 'ahead';

  // Budgeting exactly what's needed (or more)
  if (budgetRounded >= effectiveTarget) {
    return isFunded ? 'funded' : 'on_track';
  }

  // Budget below target
  return 'behind';
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
