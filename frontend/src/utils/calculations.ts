/**
 * Calculation Utilities
 *
 * Shared calculation functions that must match backend Python implementations.
 * These are used by both demo mode and potentially other frontend code.
 *
 * IMPORTANT: These functions mirror backend logic. If the Python implementation
 * changes, these must be updated to match. See parity tests in calculations.test.ts.
 *
 * Rounding Policy:
 * - Monthly targets use round() instead of ceil() to minimize overbudgeting
 * - Minimum $1/mo for any non-zero rate (prevents showing $0 for small expenses)
 * - Self-corrects: if slightly behind, rate increases as due date approaches
 */

// Frequency type matching Monarch API frequency values
export type Frequency =
  | 'weekly'
  | 'biweekly' // every 2 weeks
  | 'four_weekly' // every 4 weeks
  | 'semimonthly_start_mid' // 1st and 15th
  | 'semimonthly_mid_end' // 15th and last day
  | 'monthly'
  | 'bimonthly' // every 2 months
  | 'quarterly'
  | 'four_month' // every 4 months
  | 'semiyearly'
  | 'yearly';

/**
 * Get frequency in months (time between occurrences).
 * Matches backend Frequency.months property.
 *
 * Accepts string to handle legacy data in demo localStorage that may have
 * old values like 'annual' instead of 'yearly'.
 */
export function getFrequencyMonths(frequency: string): number {
  const FREQUENCY_MONTHS: Record<string, number> = {
    // Actual Monarch API values
    weekly: 7 / 30.44, // ~0.23 months
    biweekly: 14 / 30.44, // ~0.46 months
    four_weekly: 28 / 30.44, // ~0.92 months
    semimonthly_start_mid: 0.5, // 1st and 15th
    semimonthly_mid_end: 0.5, // 15th and last day
    monthly: 1,
    bimonthly: 2,
    quarterly: 3,
    four_month: 4,
    semiyearly: 6,
    yearly: 12,
    // Legacy aliases for backwards compatibility with old demo localStorage data
    every_two_weeks: 14 / 30.44,
    twice_a_month: 0.5,
    'semi-annual': 6,
    annual: 12,
  };
  return FREQUENCY_MONTHS[frequency] ?? 1;
}

/**
 * Round to nearest dollar, minimum $1 for non-zero rates.
 *
 * Uses standard rounding (round half up) for consistency.
 * Returns 0 for zero/negative rates (fully funded).
 *
 * This minimizes overbudgeting compared to ceil() while ensuring:
 * - Small expenses ($5/year) still show at least $1/mo
 * - The system self-corrects via monthly recalculation
 *
 * @param rate - The calculated monthly rate
 * @returns The rounded rate (minimum $1 if rate > 0)
 */
export function roundMonthlyRate(rate: number): number {
  if (rate <= 0) return 0;
  return Math.max(1, Math.round(rate));
}

// ============================================================================
// BaseDate-based Occurrence Calculator (mirrors services/occurrence_calculator.py)
// ============================================================================

/**
 * Parse an ISO date string (YYYY-MM-DD) as a local date.
 *
 * IMPORTANT: Using `new Date("2026-01-01")` parses as UTC midnight, which
 * shifts to the previous day in negative UTC offsets (e.g., US timezones).
 * This helper parses as local midnight to avoid date shift bugs.
 */
function parseLocalDate(isoDateStr: string): Date {
  const [year, month, day] = isoDateStr.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    // Fallback for malformed dates
    return new Date(isoDateStr);
  }
  return new Date(year, month - 1, day);
}

/**
 * Get last day of a month.
 */
function getLastDayOfMonth(year: number, month: number): number {
  // month is 0-indexed for JS Date
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Count day-interval occurrences within a month (weekly, bi-weekly).
 *
 * This counts ALL occurrences of the pattern that fall within the month,
 * regardless of whether baseDate is before or after monthStart.
 * For example, a weekly pattern anchored at Jan 18 would have occurrences
 * on Jan 4, 11, 18, 25 in January (4 total), not just Jan 18, 25.
 */
function countIntervalOccurrences(
  baseDate: Date,
  intervalDays: number,
  monthStart: Date,
  monthEnd: Date
): number {
  let count = 0;

  // Calculate days from baseDate to monthStart
  const daysDiff = Math.floor((monthStart.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  let current: Date;

  if (daysDiff < 0) {
    // baseDate is after monthStart - back-calculate to find first occurrence in month
    // E.g., if baseDate is Jan 18 and interval is 7, back up to Jan 11, then Jan 4
    const daysIntoMonth = -daysDiff; // How many days after monthStart is baseDate
    const intervalsBack = Math.floor(daysIntoMonth / intervalDays);
    current = new Date(baseDate);
    current.setDate(current.getDate() - intervalsBack * intervalDays);
    // If we backed up past monthStart, move forward one interval
    if (current < monthStart) {
      current.setDate(current.getDate() + intervalDays);
    }
  } else {
    // baseDate is before monthStart - skip forward to first occurrence >= monthStart
    const intervalsToSkip = Math.floor(daysDiff / intervalDays);
    current = new Date(baseDate);
    current.setDate(current.getDate() + intervalsToSkip * intervalDays);
    if (current < monthStart) {
      current.setDate(current.getDate() + intervalDays);
    }
  }

  // Count occurrences within the month
  while (current <= monthEnd) {
    if (current >= monthStart) {
      count++;
    }
    current.setDate(current.getDate() + intervalDays);
  }

  return count;
}

/**
 * Check if a monthly-interval pattern has an occurrence in target month.
 *
 * Uses O(1) modular arithmetic instead of iteration to handle dates far in the past.
 */
function hasOccurrenceInMonth(baseDate: Date, intervalMonths: number, targetMonth: Date): boolean {
  const targetYear = targetMonth.getFullYear();
  const targetMonthNum = targetMonth.getMonth();

  // If baseDate is in the future relative to targetMonth, no occurrence
  if (
    baseDate.getFullYear() > targetYear ||
    (baseDate.getFullYear() === targetYear && baseDate.getMonth() > targetMonthNum)
  ) {
    return false;
  }

  // Calculate months difference using O(1) math instead of iteration
  const monthsDiff =
    (targetYear - baseDate.getFullYear()) * 12 + (targetMonthNum - baseDate.getMonth());

  // Check if targetMonth aligns with the interval pattern
  // An occurrence exists if monthsDiff is evenly divisible by intervalMonths
  return monthsDiff % intervalMonths === 0;
}

/**
 * Count how many times this recurring item occurs in the target month.
 *
 * @param baseDate - When the recurring pattern started (ISO string)
 * @param frequency - How often it recurs
 * @param targetMonth - First day of the month to count occurrences in (ISO string)
 * @returns Number of occurrences in that month
 */
export function countOccurrencesInMonth(
  baseDate: string,
  frequency: Frequency,
  targetMonth: string
): number {
  const base = parseLocalDate(baseDate);
  const target = parseLocalDate(targetMonth);
  const monthStart = new Date(target.getFullYear(), target.getMonth(), 1);
  const lastDay = getLastDayOfMonth(target.getFullYear(), target.getMonth());
  const monthEnd = new Date(target.getFullYear(), target.getMonth(), lastDay);

  switch (frequency) {
    case 'weekly':
      return countIntervalOccurrences(base, 7, monthStart, monthEnd);
    case 'biweekly':
      return countIntervalOccurrences(base, 14, monthStart, monthEnd);
    case 'four_weekly':
      return countIntervalOccurrences(base, 28, monthStart, monthEnd);
    case 'semimonthly_start_mid':
    case 'semimonthly_mid_end':
      return 2;
    case 'monthly':
      return 1;
    case 'bimonthly':
      return hasOccurrenceInMonth(base, 2, target) ? 1 : 0;
    case 'quarterly':
      return hasOccurrenceInMonth(base, 3, target) ? 1 : 0;
    case 'four_month':
      return hasOccurrenceInMonth(base, 4, target) ? 1 : 0;
    case 'semiyearly':
      return hasOccurrenceInMonth(base, 6, target) ? 1 : 0;
    case 'yearly':
      return hasOccurrenceInMonth(base, 12, target) ? 1 : 0;
    default:
      return 0;
  }
}

/**
 * Find the next monthly-interval occurrence on or after a date.
 *
 * Uses O(1) math instead of iteration to handle dates far in the past.
 * Clamps day to last valid day of target month to avoid rollover bugs
 * (e.g., Aug 29 + 6 months = Feb 28, not Mar 1).
 */
function nextMonthlyOccurrence(baseDate: Date, intervalMonths: number, afterDate: Date): Date {
  // If baseDate is already on or after afterDate, return it
  if (baseDate >= afterDate) {
    return new Date(baseDate);
  }

  // Calculate months difference
  const monthsDiff =
    (afterDate.getFullYear() - baseDate.getFullYear()) * 12 +
    (afterDate.getMonth() - baseDate.getMonth());

  // Calculate how many intervals we need to skip (round up to ensure >= afterDate)
  const intervalsToSkip = Math.ceil(monthsDiff / intervalMonths);

  // Calculate target month/year using math (avoids setMonth date rollover bug)
  const totalMonths = baseDate.getMonth() + intervalsToSkip * intervalMonths;
  const targetYear = baseDate.getFullYear() + Math.floor(totalMonths / 12);
  const targetMonth = totalMonths % 12;

  // Clamp day to last valid day of target month (fixes Aug 29 → Feb 28, not Mar 1)
  const originalDay = baseDate.getDate();
  const lastDayOfTargetMonth = getLastDayOfMonth(targetYear, targetMonth);
  const clampedDay = Math.min(originalDay, lastDayOfTargetMonth);

  return new Date(targetYear, targetMonth, clampedDay);
}

/**
 * Find the next interval occurrence on or after a date.
 */
function nextIntervalOccurrence(baseDate: Date, intervalDays: number, afterDate: Date): Date {
  if (baseDate >= afterDate) {
    return new Date(baseDate);
  }

  const daysDiff = Math.floor((afterDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const intervalsNeeded = Math.floor(daysDiff / intervalDays);
  const candidate = new Date(baseDate);
  candidate.setDate(candidate.getDate() + intervalsNeeded * intervalDays);

  if (candidate < afterDate) {
    candidate.setDate(candidate.getDate() + intervalDays);
  }

  return candidate;
}

/**
 * Find the next occurrence that's in or after the target month.
 *
 * @param baseDate - When the recurring pattern started (ISO string)
 * @param frequency - How often it recurs
 * @param targetMonth - First day of the month to search from (ISO string)
 * @returns Date of the next occurrence (ISO string)
 */
export function nextOccurrenceInOrAfter(
  baseDate: string,
  frequency: Frequency,
  targetMonth: string
): string {
  const base = parseLocalDate(baseDate);
  const target = parseLocalDate(targetMonth);
  const monthStart = new Date(target.getFullYear(), target.getMonth(), 1);

  let result: Date;
  switch (frequency) {
    case 'weekly':
      result = nextIntervalOccurrence(base, 7, monthStart);
      break;
    case 'biweekly':
      result = nextIntervalOccurrence(base, 14, monthStart);
      break;
    case 'four_weekly':
      result = nextIntervalOccurrence(base, 28, monthStart);
      break;
    case 'semimonthly_start_mid':
    case 'semimonthly_mid_end': {
      const day = Math.min(
        base.getDate(),
        getLastDayOfMonth(target.getFullYear(), target.getMonth())
      );
      const candidate = new Date(target.getFullYear(), target.getMonth(), day);
      if (candidate >= monthStart) {
        result = candidate;
      } else {
        const nextMonth = new Date(target);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextDay = Math.min(
          base.getDate(),
          getLastDayOfMonth(nextMonth.getFullYear(), nextMonth.getMonth())
        );
        result = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextDay);
      }
      break;
    }
    case 'monthly':
      result = nextMonthlyOccurrence(base, 1, monthStart);
      break;
    case 'bimonthly':
      result = nextMonthlyOccurrence(base, 2, monthStart);
      break;
    case 'quarterly':
      result = nextMonthlyOccurrence(base, 3, monthStart);
      break;
    case 'four_month':
      result = nextMonthlyOccurrence(base, 4, monthStart);
      break;
    case 'semiyearly':
      result = nextMonthlyOccurrence(base, 6, monthStart);
      break;
    case 'yearly':
      result = nextMonthlyOccurrence(base, 12, monthStart);
      break;
    default:
      result = monthStart;
  }

  // Format as YYYY-MM-DD using local date components (avoids UTC conversion issues)
  const year = result.getFullYear();
  const month = String(result.getMonth() + 1).padStart(2, '0');
  const day = String(result.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate months between two dates.
 */
function monthsBetween(fromDate: Date, toDate: Date): number {
  return (
    (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth())
  );
}

/**
 * Calculate the monthly savings target using baseDate-based occurrence calculation.
 * This is the new stateless calculation that replaces the frozen target approach.
 *
 * Mirrors services/occurrence_calculator.py calculate_monthly_target()
 *
 * @param baseDate - When the recurring pattern started (ISO string, null falls back to targetMonth)
 * @param frequency - How often the item recurs
 * @param amount - The charge amount (positive value)
 * @param rollover - Amount rolled over from previous month (starting balance)
 * @param targetMonth - The month to calculate for (ISO string, first day of month)
 * @returns Monthly target in whole dollars (rounded, minimum $1 for non-zero)
 */
export function calculateMonthlyTarget(
  baseDate: string | null,
  frequency: Frequency,
  amount: number,
  rollover: number,
  targetMonth: string
): number {
  // Fallback if no baseDate
  const effectiveBaseDate = baseDate ?? targetMonth;
  const freqMonths = getFrequencyMonths(frequency);

  if (freqMonths < 1) {
    // Sub-monthly (weekly, bi-weekly, twice monthly)
    // Target = occurrences * amount - rollover
    const occurrences = countOccurrencesInMonth(effectiveBaseDate, frequency, targetMonth);
    const amountDue = occurrences * amount;
    const shortfall = Math.max(0, amountDue - rollover);
    return roundMonthlyRate(shortfall);
  } else if (freqMonths === 1) {
    // Monthly: target = amount - rollover
    const shortfall = Math.max(0, amount - rollover);
    return roundMonthlyRate(shortfall);
  } else {
    // Infrequent (quarterly, semiyearly, yearly)
    // Check if occurrence is in this month
    const nextOcc = nextOccurrenceInOrAfter(effectiveBaseDate, frequency, targetMonth);
    const nextOccDate = parseLocalDate(nextOcc);
    const targetDate = parseLocalDate(targetMonth);

    if (
      nextOccDate.getFullYear() === targetDate.getFullYear() &&
      nextOccDate.getMonth() === targetDate.getMonth()
    ) {
      // Due THIS month - need full amount minus rollover
      const shortfall = Math.max(0, amount - rollover);
      return roundMonthlyRate(shortfall);
    } else {
      // Due in future - spread the shortfall over months INCLUDING due month
      const monthsRemaining = monthsBetween(targetDate, nextOccDate) + 1;
      const shortfall = Math.max(0, amount - rollover);

      if (shortfall <= 0) {
        return 0;
      }
      const rate = shortfall / Math.max(1, monthsRemaining);
      return roundMonthlyRate(rate);
    }
  }
}

/**
 * Calculate the normalization date for a catching up/ahead item.
 * Normalization occurs on the 1st of the month following the payment month.
 *
 * @param nextDueDate - The next due date (ISO string)
 * @returns Formatted date string like "Apr '26"
 */
export function getNormalizationDate(nextDueDate: string): string {
  const dueDate = parseLocalDate(nextDueDate);
  const normalizationMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 1);
  const monthLabel = normalizationMonth.toLocaleDateString('en-US', { month: 'short' });
  const yearLabel = normalizationMonth.getFullYear().toString().slice(-2);
  return `${monthLabel} '${yearLabel}`;
}
