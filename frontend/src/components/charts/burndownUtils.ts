/**
 * Burndown chart utility functions and types
 *
 * The chart shows the path to the "stabilization point" - when all catch-up
 * payments complete and monthly costs reach their steady-state minimum.
 */

import type { RecurringItem } from '../../types';

/**
 * Parse a due date string and return its UTC year and month.
 *
 * Due dates are stored as ISO date strings (e.g., '2026-05-01'). When parsed,
 * JavaScript interprets these as UTC midnight. Using getMonth() would return
 * the month in local time, which can be wrong for users west of UTC
 * (e.g., '2026-05-01' at UTC midnight is April 30th in PST).
 *
 * This helper ensures we get the intended month from the date string.
 */
function getDueDateMonth(dateStr: string): { year: number; month: number } {
  const date = new Date(dateStr);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

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

  // Dedicated items: individually enabled AND not in rollup
  const dedicatedItems = items.filter((i) => i.is_enabled && !i.is_in_rollup);

  // Rollup items: in rollup (regardless of is_enabled - they share rollup category)
  const rollupItems = items.filter((i) => i.is_in_rollup);

  // All tracked items for catch-up and stabilization processing
  const allTrackedItems = [...dedicatedItems, ...rollupItems];

  // Calculate stable rate (sum of ideal rates) - single source of truth
  const stableMonthlyRate = Math.round(
    dedicatedItems.reduce((sum, i) => sum + (i.ideal_monthly_rate || 0), 0) +
      rollupItems.reduce((sum, i) => sum + (i.ideal_monthly_rate || 0), 0)
  );
  const lowestRollupCost = rollupItems.reduce((sum, i) => sum + (i.ideal_monthly_rate || 0), 0);

  // Find items with catch-up (frozen_target > ideal_rate)
  const itemsWithCatchUp = allTrackedItems.filter(
    (i) => (i.frozen_monthly_target || 0) > (i.ideal_monthly_rate || 0)
  );

  // If no items or no catch-up, return early with current month as stabilization
  if (allTrackedItems.length === 0 || itemsWithCatchUp.length === 0) {
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
  // Use UTC to avoid timezone issues (e.g., May 1st UTC midnight becoming April 30th in PST)
  let latestDueDateStr = itemsWithCatchUp[0]!.next_due_date;
  let latestDueTime = new Date(latestDueDateStr).getTime();
  for (const item of itemsWithCatchUp) {
    const dueTime = new Date(item.next_due_date).getTime();
    if (dueTime > latestDueTime) {
      latestDueTime = dueTime;
      latestDueDateStr = item.next_due_date;
    }
  }

  // Calculate stabilization info using UTC month/year from the due date string
  // Stabilization is when you first reach the stable rate at the START of a month.
  // This is the month AFTER the last catch-up completes (since catch-ups drop at end of month).
  const latestDue = getDueDateMonth(latestDueDateStr);
  const lastCatchUpMonth = new Date(latestDue.year, latestDue.month, 1);
  const stabilizationMonth = new Date(
    lastCatchUpMonth.getFullYear(),
    lastCatchUpMonth.getMonth() + 1,
    1
  );
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
  const sortedItems = [...allTrackedItems].sort(
    (a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()
  );

  // End at stabilization month (first month at stable rate), ensure at least 6 months shown
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
    // Check which items complete in this month (bill hits, catch-up ends)
    const completingThisMonth = sortedItems.filter((item) => {
      if (processedItems.has(item.id)) return false;
      // Use UTC to get the correct month from the due date string
      const due = getDueDateMonth(item.next_due_date);
      const dueMonth = new Date(due.year, due.month, 1);

      // On first month, also catch any overdue items (due before start)
      if (points.length === 0 && dueMonth < currentMonth) {
        return true;
      }

      return due.year === iterMonth.getFullYear() && due.month === iterMonth.getMonth();
    });

    const isStabilizationMonth = iterMonth.getTime() === stabilizationMonth.getTime();
    const monthLabel = iterMonth.toLocaleDateString('en-US', { month: 'short' });
    const yearLabel = iterMonth.getFullYear().toString().slice(-2);

    // Record point FIRST with current running total (beginning-of-month state)
    // This ensures the tooltip shows what you need to budget IN this month,
    // not what the state will be after this month's bills hit.
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

    // THEN subtract catch-up amounts for items completing this month
    // This affects the NEXT month's beginning-of-month state
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

    iterMonth = new Date(iterMonth.getFullYear(), iterMonth.getMonth() + 1, 1);
  }

  return { stabilization, points };
}
