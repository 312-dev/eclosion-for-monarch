/**
 * Savings Calculation Utilities
 *
 * Shared calculation functions for both Recurring items and Stash items.
 * These handle the core "save towards a goal" calculations.
 *
 * Rounding Policy (same as recurring):
 * - Monthly targets use round() instead of ceil() to minimize overbudgeting
 * - Minimum $1/mo for any non-zero rate (prevents showing $0 for small goals)
 * - Self-corrects: if slightly behind, rate increases as target date approaches
 */

import { roundMonthlyRate } from './calculations';

/**
 * Parse an ISO date string (YYYY-MM-DD) as a local date.
 *
 * IMPORTANT: Using `new Date("2026-01-01")` parses as UTC midnight, which
 * shifts to the previous day in negative UTC offsets (e.g., US timezones).
 * This helper parses as local midnight to avoid date shift bugs.
 */
export function parseLocalDate(isoDateStr: string): Date {
  const [year, month, day] = isoDateStr.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    // Fallback for malformed dates
    return new Date(isoDateStr);
  }
  return new Date(year, month - 1, day);
}

/**
 * Format a Date as ISO date string (YYYY-MM-DD).
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the first day of a month as YYYY-MM-DD.
 * Internal helper used by calculation functions.
 */
function getMonthStart(isoDateStr: string): string {
  const date = parseLocalDate(isoDateStr);
  return formatLocalDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

/**
 * Calculate months between two dates.
 * Returns 0 if toDate is in the same month or before fromDate.
 */
export function monthsBetween(fromDateStr: string, toDateStr: string): number {
  const fromDate = parseLocalDate(fromDateStr);
  const toDate = parseLocalDate(toDateStr);
  const months =
    (toDate.getFullYear() - fromDate.getFullYear()) * 12 +
    (toDate.getMonth() - fromDate.getMonth());
  return Math.max(0, months);
}

/**
 * Calculate the monthly savings target for a stash item (date-based goal).
 *
 * This is simpler than recurring items because there's no frequency -
 * just a target date to reach.
 *
 * Logic:
 * - If target date is this month or past: need full shortfall now
 * - If target date is in future: spread shortfall over remaining months
 * - Formula: shortfall / (monthsRemaining + 1) where +1 includes current month
 *
 * @param amount - The target amount to save
 * @param currentBalance - Amount already saved
 * @param targetDate - When the goal should be reached (ISO string)
 * @param currentMonth - Current month start date (ISO string, defaults to now)
 * @returns Monthly target in whole dollars (rounded, minimum $1 for non-zero)
 */
export function calculateStashMonthlyTarget(
  amount: number,
  currentBalance: number,
  targetDate: string,
  currentMonth?: string
): number {
  const shortfall = Math.max(0, amount - currentBalance);

  // Already funded
  if (shortfall <= 0) {
    return 0;
  }

  // Determine current month (first of month)
  const now = new Date();
  const currentMonthStart = currentMonth
    ? getMonthStart(currentMonth)
    : formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));

  // Get target date's month start for comparison
  const targetMonthStart = getMonthStart(targetDate);

  // Calculate months remaining
  const monthsRemaining = monthsBetween(currentMonthStart, targetMonthStart);

  // If target is this month or past, need full amount now
  if (monthsRemaining <= 0) {
    return roundMonthlyRate(shortfall);
  }

  // Spread over remaining months INCLUDING current month
  // e.g., if 2 months away, spread over 3 months (this month + 2 more)
  const rate = shortfall / (monthsRemaining + 1);
  return roundMonthlyRate(rate);
}

/**
 * Calculate months remaining until a target date.
 *
 * @param targetDate - The goal date (ISO string)
 * @param currentMonth - Current month start (ISO string, optional)
 * @returns Number of months remaining (0 if this month or past)
 */
export function calculateMonthsRemaining(targetDate: string, currentMonth?: string): number {
  const now = new Date();
  const currentMonthStart = currentMonth
    ? getMonthStart(currentMonth)
    : formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));

  const targetMonthStart = getMonthStart(targetDate);
  return monthsBetween(currentMonthStart, targetMonthStart);
}

/**
 * Calculate progress percentage.
 *
 * @param currentBalance - Amount saved
 * @param amount - Target amount
 * @returns Percentage (0-100+, can exceed 100 if overfunded)
 */
export function calculateProgressPercent(currentBalance: number, amount: number): number {
  if (amount <= 0) return 100;
  return Math.round((currentBalance / amount) * 100);
}

/**
 * Calculate shortfall (amount still needed).
 *
 * @param currentBalance - Amount saved
 * @param amount - Target amount
 * @returns Shortfall (0 if fully funded)
 */
export function calculateShortfall(currentBalance: number, amount: number): number {
  return Math.max(0, amount - currentBalance);
}

/**
 * Calculate expected progress percentage based on the monthly target.
 *
 * This shows where progress "should be" if saving the monthly target each month.
 * Based on the same logic as calculateStashMonthlyTarget:
 * - Monthly target = shortfall / (monthsRemaining + 1)
 * - After completing this month, you should have 1 month's worth saved
 * - Expected progress = 1 / (monthsRemaining + 1) * 100
 *
 * @param targetDate - When the goal should be reached (ISO string)
 * @param currentDate - Current date (ISO string, optional - defaults to today)
 * @returns Expected progress percentage (0-100), or null if cannot be calculated
 */
export function calculateExpectedProgress(
  targetDate: string | undefined | null,
  currentDate?: string
): number | null {
  if (!targetDate) {
    return null;
  }

  // Calculate months remaining (same logic as calculateStashMonthlyTarget)
  const monthsRemaining = calculateMonthsRemaining(targetDate, currentDate);

  // If target is this month or past, expected is 100%
  if (monthsRemaining <= 0) {
    return 100;
  }

  // Total months in the plan = monthsRemaining + 1 (includes current month)
  // After this month, you should have completed 1 out of totalMonths
  const totalMonths = monthsRemaining + 1;
  const expected = (1 / totalMonths) * 100;

  return Math.min(100, Math.max(0, expected));
}

/**
 * Format months remaining as a human-readable string.
 *
 * @param monthsRemaining - Number of months
 * @returns Formatted string like "1 year 2 months", "2 months", "1 month", "This month"
 */
export function formatMonthsRemaining(monthsRemaining: number): string {
  if (monthsRemaining <= 0) {
    return 'This month';
  }
  if (monthsRemaining < 12) {
    return monthsRemaining === 1 ? '1 month' : `${monthsRemaining} months`;
  }

  const years = Math.floor(monthsRemaining / 12);
  const months = monthsRemaining % 12;

  const yearStr = years === 1 ? '1 year' : `${years} years`;

  if (months === 0) {
    return yearStr;
  }

  const monthStr = months === 1 ? '1 month' : `${months} months`;
  return `${yearStr} ${monthStr}`;
}

/**
 * Get common quick-pick dates for goal setting.
 *
 * @returns Object with date options as ISO strings
 */
export function getQuickPickDates(): {
  thisMonth: string;
  nextMonth: string;
  twoMonths: string;
  threeMonths: string;
  sixMonths: string;
  oneYear: string;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // End of this month
  const thisMonth = new Date(year, month + 1, 0);

  // End of next month
  const nextMonth = new Date(year, month + 2, 0);

  // End of month 2 months from now
  const twoMonths = new Date(year, month + 3, 0);

  // End of month 3 months from now
  const threeMonths = new Date(year, month + 4, 0);

  // End of month 6 months from now
  const sixMonths = new Date(year, month + 7, 0);

  // End of month 1 year from now
  const oneYear = new Date(year + 1, month + 1, 0);

  return {
    thisMonth: formatLocalDate(thisMonth),
    nextMonth: formatLocalDate(nextMonth),
    twoMonths: formatLocalDate(twoMonths),
    threeMonths: formatLocalDate(threeMonths),
    sixMonths: formatLocalDate(sixMonths),
    oneYear: formatLocalDate(oneYear),
  };
}
