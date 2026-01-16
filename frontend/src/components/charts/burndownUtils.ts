/**
 * Burndown chart utility functions and types
 *
 * The chart shows the path to the "stabilization point" - when all catch-up
 * payments complete and monthly costs reach their steady-state minimum.
 */

import type { RecurringItem } from '../../types';

/**
 * Information about when the monthly rate stabilizes
 */
export interface StabilizationInfo {
  /** Final stable monthly rate (sum of all ideal rates) */
  stableMonthlyRate: number;
  /** How many months until stabilization */
  monthsUntilStable: number;
  /** Formatted date string, e.g., "Mar '25" */
  stabilizationDate: string;
  /** Whether there are any items with catch-up in progress */
  hasCatchUp: boolean;
}

export interface BurndownPoint {
  month: string;
  fullLabel: string;
  amount: number;
  rollupAmount: number;
  hasChange: boolean;
  completingItems: string[];
}

export interface BurndownData {
  stabilization: StabilizationInfo;
  points: BurndownPoint[];
}

/**
 * Calculate burndown data and stabilization point in one pass.
 *
 * The stabilization point is when all catch-up payments complete - i.e., when
 * all items with frozen_monthly_target > ideal_monthly_rate have had their
 * bills hit and reset to ideal rates.
 *
 * Note: Over-contributing is NOT factored in. This projection assumes the user
 * budgets exactly the frozen target each month.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity -- Chart projection requires iterating through months with bill events, catch-up logic, and rollup aggregation
export function calculateBurndownData(
  items: RecurringItem[],
  currentMonthlyCost: number
): BurndownData {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get all enabled items
  const enabledItems = items.filter((i) => i.is_enabled);
  const dedicatedItems = enabledItems.filter((i) => !i.is_in_rollup);
  const rollupItems = enabledItems.filter((i) => i.is_in_rollup);

  // Calculate stable rate (sum of ideal rates) - single source of truth
  const stableMonthlyRate = Math.round(
    dedicatedItems.reduce((sum, i) => sum + (i.ideal_monthly_rate || 0), 0) +
      rollupItems.reduce((sum, i) => sum + (i.ideal_monthly_rate || 0), 0)
  );
  const lowestRollupCost = rollupItems.reduce((sum, i) => sum + (i.ideal_monthly_rate || 0), 0);

  // Find items with catch-up (frozen_target > ideal_rate)
  const itemsWithCatchUp = enabledItems.filter(
    (i) => (i.frozen_monthly_target || 0) > (i.ideal_monthly_rate || 0)
  );

  // If no items or no catch-up, return early with current month as stabilization
  if (enabledItems.length === 0 || itemsWithCatchUp.length === 0) {
    const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'short' });
    const yearLabel = currentMonth.getFullYear().toString().slice(-2);
    return {
      stabilization: {
        stableMonthlyRate,
        monthsUntilStable: 0,
        stabilizationDate: `${monthLabel} '${yearLabel}`,
        hasCatchUp: false,
      },
      points: [],
    };
  }

  // Find the latest due date among items with catch-up
  let latestDueDate = new Date(itemsWithCatchUp[0]!.next_due_date);
  for (const item of itemsWithCatchUp) {
    const dueDate = new Date(item.next_due_date);
    if (dueDate > latestDueDate) {
      latestDueDate = dueDate;
    }
  }

  // Calculate stabilization info
  const stabilizationMonth = new Date(latestDueDate.getFullYear(), latestDueDate.getMonth(), 1);
  const monthsUntilStable = Math.max(
    0,
    (stabilizationMonth.getFullYear() - currentMonth.getFullYear()) * 12 +
      (stabilizationMonth.getMonth() - currentMonth.getMonth())
  );
  const stabMonthLabel = stabilizationMonth.toLocaleDateString('en-US', { month: 'short' });
  const stabYearLabel = stabilizationMonth.getFullYear().toString().slice(-2);

  const stabilization: StabilizationInfo = {
    stableMonthlyRate,
    monthsUntilStable,
    stabilizationDate: `${stabMonthLabel} '${stabYearLabel}`,
    hasCatchUp: true,
  };

  // Generate burndown points
  const sortedItems = [...enabledItems].sort(
    (a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()
  );

  // End at stabilization month (not after), ensure at least 6 months shown
  const minEndMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 6, 1);
  const endMonth = new Date(Math.max(stabilizationMonth.getTime(), minEndMonth.getTime()));

  let rollupRunningTotal = rollupItems.reduce(
    (sum, item) => sum + (item.frozen_monthly_target || item.ideal_monthly_rate),
    0
  );
  const points: BurndownPoint[] = [];
  let runningTotal = currentMonthlyCost;
  let iterMonth = new Date(currentMonth);
  const processedItems = new Set<string>();

  while (iterMonth <= endMonth) {
    // Check which items complete in this month
    const completingThisMonth = sortedItems.filter((item) => {
      if (processedItems.has(item.id)) return false;
      const dueDate = new Date(item.next_due_date);
      const dueMonth = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);

      // On first month, also catch any overdue items (due before start)
      if (points.length === 0 && dueMonth < currentMonth) {
        return true;
      }

      return (
        dueDate.getFullYear() === iterMonth.getFullYear() &&
        dueDate.getMonth() === iterMonth.getMonth()
      );
    });

    // Calculate how much catch-up drops when items complete
    for (const item of completingThisMonth) {
      const currentRate = item.frozen_monthly_target || item.ideal_monthly_rate || 0;
      const catchUpAmount = currentRate - item.ideal_monthly_rate;
      if (catchUpAmount > 0) {
        runningTotal -= catchUpAmount;
        if (item.is_in_rollup) {
          rollupRunningTotal -= catchUpAmount;
        }
      }
      processedItems.add(item.id);
    }

    const isStabilizationMonth = iterMonth.getTime() === stabilizationMonth.getTime();
    const monthLabel = iterMonth.toLocaleDateString('en-US', { month: 'short' });
    const yearLabel = iterMonth.getFullYear().toString().slice(-2);

    // At stabilization month, use the stable rate (all catch-ups complete)
    const amount = isStabilizationMonth ? stableMonthlyRate : Math.max(0, Math.round(runningTotal));
    const rollupAmount = isStabilizationMonth
      ? Math.round(lowestRollupCost)
      : Math.max(0, Math.round(rollupRunningTotal));

    points.push({
      month: monthLabel,
      fullLabel: `${monthLabel} '${yearLabel}`,
      amount,
      rollupAmount,
      hasChange: completingThisMonth.length > 0,
      completingItems: completingThisMonth.map((i) => i.name),
    });

    iterMonth = new Date(iterMonth.getFullYear(), iterMonth.getMonth() + 1, 1);
  }

  return { stabilization, points };
}
