/**
 * Formatting Utilities
 *
 * Centralized formatting functions for currency, dates, and frequencies.
 * Eliminates duplication across RecurringList, RollupZone, and ReadyToAssign.
 */

/**
 * Format a number as USD currency.
 *
 * @param amount - The amount to format
 * @param options - Optional formatting options
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(
  amount: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const maxDigits = options?.maximumFractionDigits ?? 2;
  const minDigits = options?.minimumFractionDigits ?? Math.min(2, maxDigits);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  }).format(amount);
}

/**
 * Frequency labels for display.
 */
export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Every week',
  every_two_weeks: 'Every 2 weeks',
  twice_a_month: 'Twice a month',
  monthly: 'Every month',
  quarterly: 'Every 3 months',
  semiyearly: 'Every 6 months',
  yearly: 'Every year',
};

/**
 * Short frequency labels for compact display.
 */
export const FREQUENCY_SHORT_LABELS: Record<string, string> = {
  weekly: 'weekly',
  every_two_weeks: 'biweekly',
  twice_a_month: '2x/mo',
  monthly: 'monthly',
  quarterly: 'quarterly',
  semiyearly: 'semiannually',
  yearly: 'annually',
};

/**
 * Frequency sort order (most frequent first).
 */
export const FREQUENCY_ORDER: Record<string, number> = {
  weekly: 1,
  every_two_weeks: 2,
  twice_a_month: 3,
  monthly: 4,
  quarterly: 5,
  semiyearly: 6,
  yearly: 7,
};

/**
 * Format a frequency string for display.
 *
 * @param freq - The frequency key (e.g., "monthly", "yearly")
 * @returns Human-readable frequency (e.g., "Every month")
 */
export function formatFrequency(freq: string): string {
  return FREQUENCY_LABELS[freq] || freq;
}

/**
 * Format a frequency string in short form.
 *
 * @param freq - The frequency key (e.g., "monthly", "yearly")
 * @returns Short frequency label (e.g., "monthly", "annually")
 */
export function formatFrequencyShort(freq: string): string {
  return FREQUENCY_SHORT_LABELS[freq] || freq;
}

/**
 * Result of relative date formatting.
 */
export interface RelativeDateResult {
  /** Formatted date string (e.g., "Jan 15" or "Jan 15 '25") */
  date: string;
  /** Relative time string in shorthand (e.g., "in 5d", "Tomorrow", "3d ago") */
  relative: string;
}

/**
 * Format a date string with both absolute and relative representations.
 *
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Object with formatted date and relative time
 */
export function formatDateRelative(dateStr: string): RelativeDateResult {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Format date - include year with apostrophe if different year
  const currentYear = today.getFullYear();
  const dateYear = date.getFullYear();
  let formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (dateYear !== currentYear) {
    formatted += ` '${String(dateYear).slice(-2)}`;
  }

  let relative = '';
  if (diffDays === 0) {
    relative = 'Today';
  } else if (diffDays === 1) {
    relative = 'Tomorrow';
  } else if (diffDays === -1) {
    relative = '1d ago';
  } else if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays < 30) {
      relative = `${absDays}d ago`;
    } else if (absDays < 365) {
      const months = Math.round(absDays / 30);
      relative = `${months}mo ago`;
    } else {
      const years = Math.round(absDays / 365);
      relative = `${years}y ago`;
    }
  } else if (diffDays <= 30) {
    relative = `in ${diffDays}d`;
  } else if (diffDays <= 365) {
    const months = Math.round(diffDays / 30);
    relative = `in ${months}mo`;
  } else {
    const years = Math.round(diffDays / 365);
    relative = `in ${years}y`;
  }

  return { date: formatted, relative };
}

/**
 * Format a number as a percentage.
 *
 * @param value - The value to format (0-100 or 0-1 depending on isDecimal)
 * @param isDecimal - If true, treats value as decimal (0-1), otherwise as percentage (0-100)
 * @returns Formatted percentage string (e.g., "75%")
 */
export function formatPercent(value: number, isDecimal = false): string {
  const percent = isDecimal ? value * 100 : value;
  return `${Math.round(percent)}%`;
}

/**
 * Format a date string for due date display.
 *
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Formatted date (e.g., "Jan 15" or "Jan 15, 2025" if different year)
 */
export function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const sameYear = date.getFullYear() === today.getFullYear();

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Format a date string for compact display.
 *
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Formatted date (e.g., "Jan 15")
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format an interval in minutes for display.
 *
 * @param minutes - Interval in minutes
 * @returns Human-readable interval (e.g., "6 hours", "30 minutes")
 */
export function formatInterval(minutes: number): string {
  if (minutes >= 60) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/**
 * Format an ISO datetime string for display.
 *
 * @param isoString - ISO datetime string or null
 * @returns Formatted datetime (e.g., "Jan 15, 2025 at 3:45 PM") or "Never"
 */
export function formatDateTime(isoString: string | null): string {
  if (!isoString) return 'Never';
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
