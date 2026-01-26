/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable unicorn/prefer-number-properties */
/**
 * Event-Aware Projection Calculation
 *
 * Calculates projected completion date by simulating month-by-month balance changes.
 * Unlike the simple formula (remaining / rate), this handles:
 * - One-time deposits ('1x') that add a lump sum in a specific month
 * - Rate changes ('mo') that alter the contribution from that month forward
 */

import type { StashEvent } from '../types';

export interface ProjectionResult {
  /** Projected completion date, or null if won't complete in 50 years */
  projectedDate: Date | null;
}

/**
 * Calculate projected completion date with events.
 *
 * @param startingBalance - Current balance (including rollover from Screen 1)
 * @param targetAmount - Goal amount to reach
 * @param baseMonthlyRate - Monthly contribution from Screen 2
 * @param events - List of events (sorted chronologically)
 * @returns Projected completion date or null
 */
export function calculateProjectedDateWithEvents(
  startingBalance: number,
  targetAmount: number,
  baseMonthlyRate: number,
  events: StashEvent[]
): ProjectionResult {
  // Already funded
  if (startingBalance >= targetAmount) {
    return { projectedDate: new Date() };
  }

  // No rate and no contributing events means never funded
  const has1xEvents = events.some((e) => e.type === '1x' && e.amount > 0);
  const hasMoEvents = events.some((e) => e.type === 'mo' && e.amount > 0);
  if (baseMonthlyRate <= 0 && !has1xEvents && !hasMoEvents) {
    return { projectedDate: null };
  }

  // Start simulation from current month
  const now = new Date();
  let currentYear = now.getFullYear();
  let currentMonth = now.getMonth(); // 0-indexed
  let balance = startingBalance;
  let monthlyRate = baseMonthlyRate;

  // Build a map of events by month for O(1) lookup
  const eventsByMonth = new Map<string, StashEvent[]>();
  for (const event of events) {
    const existing = eventsByMonth.get(event.month) ?? [];
    eventsByMonth.set(event.month, [...existing, event]);
  }

  // Simulate up to 50 years (600 months) - matches simple calculation behavior
  const MAX_MONTHS = 600;

  for (let i = 0; i < MAX_MONTHS; i++) {
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    // Apply events for this month
    const monthEvents = eventsByMonth.get(monthKey);
    if (monthEvents) {
      for (const event of monthEvents) {
        if (event.type === '1x') {
          // One-time deposit
          balance += event.amount;
        } else if (event.type === 'mo') {
          // Rate change - applies from this month forward
          monthlyRate = event.amount;
        }
      }
    }

    // Add monthly contribution
    balance += monthlyRate;

    // Check if funded
    if (balance >= targetAmount) {
      // Return the first day of this month
      return {
        projectedDate: new Date(currentYear, currentMonth, 1),
      };
    }

    // Advance to next month
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
  }

  // Won't complete in 50 years
  return { projectedDate: null };
}

/**
 * Calculate the minimum monthly rate needed to reach target by target date,
 * accounting for planned events.
 *
 * Uses binary search with the existing simulation function.
 *
 * @param startingBalance - Current balance (including rollover from Screen 1)
 * @param targetAmount - Goal amount to reach
 * @param targetDate - Target date string (YYYY-MM-DD format)
 * @param events - List of events (sorted chronologically)
 * @returns Minimum monthly rate needed, or 0 if events alone are sufficient
 */
export function calculateMinimumRateWithEvents(
  startingBalance: number,
  targetAmount: number,
  targetDate: string,
  events: StashEvent[]
): number {
  // Already funded - no rate needed
  if (startingBalance >= targetAmount) return 0;

  // No target date - can't calculate
  if (!targetDate) return 0;

  // Parse target date to get the target month timestamp
  // Append T00:00:00 to interpret as local midnight, not UTC
  // Without this, '2026-06-01' becomes May 31st in western timezones
  const target = new Date(targetDate + 'T00:00:00');
  const targetMonth = target.getTime();

  // Check if $0/mo with events reaches the goal in time
  const zeroRateResult = calculateProjectedDateWithEvents(startingBalance, targetAmount, 0, events);
  if (zeroRateResult.projectedDate && zeroRateResult.projectedDate.getTime() <= targetMonth) {
    return 0; // Events alone are sufficient
  }

  // Binary search for minimum rate
  let minRate = 0;
  let maxRate = targetAmount; // Upper bound

  for (let i = 0; i < 20; i++) {
    // 20 iterations = precision < $1
    const midRate = Math.floor((minRate + maxRate) / 2);
    const result = calculateProjectedDateWithEvents(startingBalance, targetAmount, midRate, events);

    if (result.projectedDate && result.projectedDate.getTime() <= targetMonth) {
      maxRate = midRate; // This rate works, try lower
    } else {
      minRate = midRate + 1; // Need higher rate
    }
  }

  return Math.max(0, maxRate);
}

/**
 * Format a month key (YYYY-MM) for display.
 * Returns "Mon 'YY" format (e.g., "Jan '26").
 */
export function formatMonthKeyShort(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr ?? '2026', 10);
  const month = parseInt(monthStr ?? '1', 10) - 1; // 0-indexed

  const date = new Date(year, month, 1);
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
  const shortYear = `'${String(year).slice(-2)}`;

  return `${monthName} ${shortYear}`;
}

/**
 * Get available months for the event dropdown.
 * Returns months from current month through 10 years ahead.
 */
export function getAvailableMonths(): Array<{ value: string; label: string }> {
  const months: Array<{ value: string; label: string }> = [];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();

  // Generate 120 months (10 years) starting from current month
  for (let i = 0; i < 120; i++) {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = formatMonthKeyShort(monthKey);
    months.push({ value: monthKey, label });

    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  return months;
}

/**
 * Get current month key in YYYY-MM format.
 */
export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
