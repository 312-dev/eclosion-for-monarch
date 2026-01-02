/**
 * Burndown chart utility functions and types
 */

import type { RecurringItem } from '../../types';

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
