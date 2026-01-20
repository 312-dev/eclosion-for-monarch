/**
 * Burndown chart utility functions and types
 *
 * The chart shows the path to the "stabilization point" - when all catch-up
 * payments complete and monthly costs reach their steady-state minimum.
 */

import type { RecurringItem } from '../../types';
import {
  countOccurrencesInMonth,
  nextOccurrenceInOrAfter,
  type Frequency,
} from '../../utils/calculations';

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
 * Format a Date as an ISO date string (YYYY-MM-DD) in local time.
 * Avoids timezone issues that occur with toISOString() which converts to UTC.
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string (YYYY-MM-DD) as a local date.
 * Avoids timezone issues that occur with new Date(string) which parses as UTC.
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year!, month! - 1, day);
}

/**
 * Check if an item has an occurrence in the target month using base_date + frequency pattern.
 * Falls back to next_due_date if base_date is not available.
 */
function hasOccurrenceInMonth(item: RecurringItem, targetMonth: Date): boolean {
  const targetMonthStr = formatLocalDate(targetMonth);

  // Use base_date + frequency pattern if available (stable across renewals)
  if (item.base_date) {
    const occurrences = countOccurrencesInMonth(
      item.base_date,
      item.frequency as Frequency,
      targetMonthStr
    );
    return occurrences > 0;
  }

  // Fallback to next_due_date for items without base_date
  const due = getDueDateMonth(item.next_due_date);
  return due.year === targetMonth.getFullYear() && due.month === targetMonth.getMonth();
}

/**
 * Find the next occurrence date for an item using base_date + frequency pattern.
 * Falls back to next_due_date if base_date is not available.
 */
function getNextOccurrence(item: RecurringItem, afterMonth: Date): Date {
  const afterMonthStr = formatLocalDate(afterMonth);

  // Use base_date + frequency pattern if available (stable across renewals)
  if (item.base_date) {
    const nextOccStr = nextOccurrenceInOrAfter(
      item.base_date,
      item.frequency as Frequency,
      afterMonthStr
    );
    return parseLocalDate(nextOccStr);
  }

  // Fallback to next_due_date for items without base_date
  return parseLocalDate(item.next_due_date);
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
  /** True for the first month at the stable rate (the stabilization point) */
  isStabilizationPoint: boolean;
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
  _currentMonthlyCost: number // Unused - starting cost is calculated internally
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

  // Find the latest occurrence date among items with catch-up
  // Use base_date + frequency pattern for stable calculation
  let latestOccurrence = getNextOccurrence(itemsWithCatchUp[0]!, currentMonth);
  for (const item of itemsWithCatchUp) {
    const nextOcc = getNextOccurrence(item, currentMonth);
    if (nextOcc.getTime() > latestOccurrence.getTime()) {
      latestOccurrence = nextOcc;
    }
  }

  // Calculate stabilization info
  // Stabilization is when you first reach the stable rate at the START of a month.
  // This is the month AFTER the last catch-up completes (since catch-ups drop at end of month).
  const lastCatchUpMonth = new Date(latestOccurrence.getFullYear(), latestOccurrence.getMonth(), 1);
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
  // Sort items by their next occurrence date using base_date + frequency pattern
  const sortedItems = [...allTrackedItems].sort(
    (a, b) =>
      getNextOccurrence(a, currentMonth).getTime() - getNextOccurrence(b, currentMonth).getTime()
  );

  // End at stabilization month (first month at stable rate), ensure at least 6 months shown
  const minEndMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 6, 1);
  const endMonth = new Date(Math.max(stabilizationMonth.getTime(), minEndMonth.getTime()));

  // Start with frozen_monthly_target for the current month - this is what you
  // actually need to budget NOW. When bills hit, rates adjust toward ideal.
  let rollupRunningTotal = rollupItems.reduce(
    (sum, item) => sum + (item.frozen_monthly_target || 0),
    0
  );
  const points: BurndownPoint[] = [];
  let runningTotal = allTrackedItems.reduce(
    (sum, item) => sum + (item.frozen_monthly_target || 0),
    0
  );
  let iterMonth = new Date(currentMonth);
  const processedItems = new Set<string>();

  while (iterMonth <= endMonth) {
    // Check which items complete in this month (bill hits, catch-up ends)
    // Uses base_date + frequency pattern for stable occurrence detection
    const completingThisMonth = sortedItems.filter((item) => {
      if (processedItems.has(item.id)) return false;

      // Check if this item has an occurrence in the current iteration month
      // On first month, also catch any overdue items (occurrence before start)
      if (points.length === 0) {
        const nextOcc = getNextOccurrence(item, currentMonth);
        const nextOccMonth = new Date(nextOcc.getFullYear(), nextOcc.getMonth(), 1);
        return nextOccMonth < currentMonth || hasOccurrenceInMonth(item, iterMonth);
      }

      return hasOccurrenceInMonth(item, iterMonth);
    });

    const isStabilizationMonth = iterMonth.getTime() === stabilizationMonth.getTime();
    const monthLabel = iterMonth.toLocaleDateString('en-US', { month: 'short' });
    const yearLabel = iterMonth.getFullYear().toString().slice(-2);

    // Record point FIRST with current running total (beginning-of-month state)
    // This ensures the tooltip shows what you need to budget IN this month,
    // not what the state will be after this month's bills hit.
    const amount = isStabilizationMonth ? stableMonthlyRate : Math.round(runningTotal);
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
      isStabilizationPoint: isStabilizationMonth,
    });

    // THEN adjust rates for items whose bills hit this month
    // This affects the NEXT month's beginning-of-month state
    for (const item of completingThisMonth) {
      const frozen = item.frozen_monthly_target || 0;
      const ideal = item.ideal_monthly_rate || 0;
      const adjustment = ideal - frozen;
      // adjustment > 0: ahead item resets UP to ideal (increase cost)
      // adjustment < 0: catching-up item resets DOWN to ideal (decrease cost)
      if (adjustment !== 0) {
        runningTotal += adjustment;
        if (item.is_in_rollup) {
          rollupRunningTotal += adjustment;
        }
      }
      processedItems.add(item.id);
    }

    iterMonth = new Date(iterMonth.getFullYear(), iterMonth.getMonth() + 1, 1);
  }

  return { stabilization, points };
}
