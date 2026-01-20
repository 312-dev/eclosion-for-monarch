/**
 * Savings Calculation Utilities
 *
 * Shared calculation functions for both Recurring items and Wishlist items.
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
 */
export function getMonthStart(isoDateStr: string): string {
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
 * Calculate the monthly savings target for a wishlist item (date-based goal).
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
export function calculateWishlistMonthlyTarget(
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
 * Format months remaining as a human-readable string.
 *
 * @param monthsRemaining - Number of months
 * @returns Formatted string like "2 months", "1 month", "This month"
 */
export function formatMonthsRemaining(monthsRemaining: number): string {
  if (monthsRemaining <= 0) {
    return 'This month';
  }
  if (monthsRemaining === 1) {
    return '1 month';
  }
  return `${monthsRemaining} months`;
}

/**
 * Get end of month date.
 *
 * @param isoDateStr - Any date in the month (ISO string)
 * @returns Last day of that month (ISO string)
 */
export function getEndOfMonth(isoDateStr: string): string {
  const date = parseLocalDate(isoDateStr);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return formatLocalDate(lastDay);
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
