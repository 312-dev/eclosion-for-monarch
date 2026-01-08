/**
 * Burndown chart utility functions and types
 *
 * The chart shows the path to the "stabilization point" - when all catch-up
 * payments complete and monthly costs reach their steady-state minimum.
 */

import type { RecurringItem, RollupData } from '../../types';

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

/**
 * Calculate when the monthly rate will stabilize.
 *
 * The stabilization point is when all catch-up payments complete - i.e., when
 * all items with frozen_monthly_target > ideal_monthly_rate have had their
 * bills hit and reset to ideal rates.
 *
 * Note: Over-contributing is NOT factored in. This projection assumes the user
 * budgets exactly the frozen target each month.
 */
export function calculateStabilizationPoint(
  items: RecurringItem[],
  rollup: RollupData | null
): StabilizationInfo {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get all enabled items (both dedicated and rollup)
  const dedicatedItems = items.filter(i => i.is_enabled && !i.is_in_rollup);
  const rollupItems = rollup?.enabled ? rollup.items : [];

  // Calculate stable rate (sum of ideal rates)
  const dedicatedStableRate = dedicatedItems.reduce(
    (sum, i) => sum + (i.ideal_monthly_rate || 0),
    0
  );
  const rollupStableRate = rollupItems.reduce(
    (sum, i) => sum + (i.ideal_monthly_rate || 0),
    0
  );
  const stableMonthlyRate = Math.round(dedicatedStableRate + rollupStableRate);

  // Find items with catch-up (frozen_target > ideal_rate)
  const itemsWithCatchUp = [
    ...dedicatedItems.filter(i =>
      (i.frozen_monthly_target || 0) > (i.ideal_monthly_rate || 0)
    ),
    ...rollupItems.filter(i =>
      (i.frozen_monthly_target || 0) > (i.ideal_monthly_rate || 0)
    ),
  ];

  if (itemsWithCatchUp.length === 0) {
    // Already at stable rate
    const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'short' });
    const yearLabel = currentMonth.getFullYear().toString().slice(-2);
    return {
      stableMonthlyRate,
      monthsUntilStable: 0,
      stabilizationDate: `${monthLabel} '${yearLabel}`,
      hasCatchUp: false,
    };
  }

  // Find the latest due date among items with catch-up
  // Safe to use [0] since we checked itemsWithCatchUp.length === 0 above
  let latestDueDate = new Date(itemsWithCatchUp[0]!.next_due_date);
  for (const item of itemsWithCatchUp) {
    const dueDate = new Date(item.next_due_date);
    if (dueDate > latestDueDate) {
      latestDueDate = dueDate;
    }
  }

  // Calculate months until stable
  const stabilizationMonth = new Date(
    latestDueDate.getFullYear(),
    latestDueDate.getMonth(),
    1
  );
  const monthsUntilStable = Math.max(
    0,
    (stabilizationMonth.getFullYear() - currentMonth.getFullYear()) * 12 +
      (stabilizationMonth.getMonth() - currentMonth.getMonth())
  );

  const monthLabel = stabilizationMonth.toLocaleDateString('en-US', { month: 'short' });
  const yearLabel = stabilizationMonth.getFullYear().toString().slice(-2);

  return {
    stableMonthlyRate,
    monthsUntilStable,
    stabilizationDate: `${monthLabel} '${yearLabel}`,
    hasCatchUp: true,
  };
}

export interface BurndownPoint {
  month: string;
  fullLabel: string;
  amount: number;
  rollupAmount: number;
  hasChange: boolean;
  completingItems: string[];
}

export function calculateBurndownData(items: RecurringItem[], currentMonthlyCost: number, lowestMonthlyCost: number): BurndownPoint[] {
  const enabledItems = items.filter(i => i.is_enabled && i.progress_percent < 100);

  if (enabledItems.length === 0) return [];

  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Sort items by next_due_date
  const sortedItems = [...enabledItems].sort((a, b) =>
    new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()
  );

  // Find the latest due date (when we reach minimum)
  const lastItem = sortedItems[sortedItems.length - 1];
  if (!lastItem) return [];
  const latestDate = new Date(lastItem.next_due_date);
  const latestEndMonth = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 1);

  // Ensure at least 6 months are shown
  const minEndMonth = new Date(startMonth.getFullYear(), startMonth.getMonth() + 6, 1);
  const endMonth = new Date(Math.max(latestEndMonth.getTime(), minEndMonth.getTime()));

  // Calculate initial rollup contribution (sum of frozen_monthly_target for rollup items)
  // Note: rollup items may not be individually "enabled" - they're tracked via the shared rollup category
  const rollupItems = items.filter(i => i.is_in_rollup);
  // For rollup items, always use ideal_monthly_rate since catch-up is managed
  // at the rollup category level, not per-item
  let rollupRunningTotal = rollupItems.reduce((sum, item) => sum + item.ideal_monthly_rate, 0);

  // Calculate lowest rollup cost (ideal rates only)
  const lowestRollupCost = rollupItems.reduce((sum, item) => sum + item.ideal_monthly_rate, 0);

  const points: BurndownPoint[] = [];
  let runningTotal = currentMonthlyCost;
  let currentMonth = new Date(startMonth);
  const processedItems = new Set<string>();

  // Calculate total months in range - if <= 6, show all months
  const totalMonths = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 +
    (endMonth.getMonth() - startMonth.getMonth()) + 1;
  const showAllMonths = totalMonths <= 6;

  while (currentMonth <= endMonth) {
    // Check which items complete in this month
    // Items are considered completing if their due date is in this month OR before (for overdue items on first iteration)
    const completingThisMonth = sortedItems.filter(item => {
      if (processedItems.has(item.id)) return false;
      const dueDate = new Date(item.next_due_date);
      const dueMonth = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);

      // On first month, also catch any overdue items (due before start)
      const isFirst = points.length === 0;
      if (isFirst && dueMonth < startMonth) {
        return true;
      }

      return dueDate.getFullYear() === currentMonth.getFullYear() &&
             dueDate.getMonth() === currentMonth.getMonth();
    });

    // Calculate how much catch-up drops when items complete
    // frozen_monthly_target is the catch-up aware rate, ideal_monthly_rate is the steady-state rate
    for (const item of completingThisMonth) {
      const currentRate = item.frozen_monthly_target || item.ideal_monthly_rate || 0;
      const catchUpAmount = currentRate - item.ideal_monthly_rate;
      if (catchUpAmount > 0) {
        runningTotal -= catchUpAmount;
        // Also reduce rollup running total if this is a rollup item
        if (item.is_in_rollup) {
          rollupRunningTotal -= catchUpAmount;
        }
      }
      processedItems.add(item.id);
    }

    // Add point if: showing all months, there's a change, or it's the first/last month
    const isFirst = points.length === 0;
    const isLast = currentMonth.getTime() === endMonth.getTime();

    if (showAllMonths || isFirst || completingThisMonth.length > 0 || isLast) {
      const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'short' });
      const yearLabel = currentMonth.getFullYear().toString().slice(-2);

      // For the last point, use the known lowest cost to ensure accuracy
      const amount = isLast ? Math.round(lowestMonthlyCost) : Math.max(0, Math.round(runningTotal));
      const rollupAmount = isLast ? Math.round(lowestRollupCost) : Math.max(0, Math.round(rollupRunningTotal));

      points.push({
        month: monthLabel,
        fullLabel: `${monthLabel} '${yearLabel}`,
        amount,
        rollupAmount,
        hasChange: completingThisMonth.length > 0,
        completingItems: completingThisMonth.map(i => i.name)
      });
    }

    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  }

  return points;
}
