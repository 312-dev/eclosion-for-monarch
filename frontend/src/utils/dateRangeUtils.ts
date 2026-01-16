/**
 * Date Range Utilities
 *
 * Helper functions for date range selection in the notes export feature.
 */

import type { MonthKey } from '../types/notes';

export type PresetId = 'this-month' | 'last-3' | 'last-6' | 'this-year' | 'last-year' | 'custom';

export interface DateRangePreset {
  id: PresetId;
  label: string;
  getRange: () => { start: MonthKey; end: MonthKey };
}

export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Format year and month to month key
 */
export function formatMonthKey(year: number, month: number): MonthKey {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Parse month key to get year and month
 */
export function parseMonthKey(monthKey: MonthKey): { year: number; month: number } {
  const parts = monthKey.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  return { year, month };
}

/**
 * Get current month key
 */
export function getCurrentMonthKey(): MonthKey {
  const now = new Date();
  return formatMonthKey(now.getFullYear(), now.getMonth() + 1);
}

/**
 * Get month key for N months ago
 */
export function getMonthsAgo(months: number): MonthKey {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() - months, 1);
  return formatMonthKey(date.getFullYear(), date.getMonth() + 1);
}

/**
 * Create preset definitions for date range selection
 */
export function createDateRangePresets(): DateRangePreset[] {
  const now = new Date();
  const currentYear = now.getFullYear();

  return [
    {
      id: 'this-month',
      label: 'This Month',
      getRange: () => {
        const current = getCurrentMonthKey();
        return { start: current, end: current };
      },
    },
    {
      id: 'last-3',
      label: 'Last 3 Months',
      getRange: () => ({
        start: getMonthsAgo(2),
        end: getCurrentMonthKey(),
      }),
    },
    {
      id: 'last-6',
      label: 'Last 6 Months',
      getRange: () => ({
        start: getMonthsAgo(5),
        end: getCurrentMonthKey(),
      }),
    },
    {
      id: 'this-year',
      label: 'This Year',
      getRange: () => ({
        start: formatMonthKey(currentYear, 1),
        end: formatMonthKey(currentYear, 12),
      }),
    },
    {
      id: 'last-year',
      label: 'Last Year',
      getRange: () => ({
        start: formatMonthKey(currentYear - 1, 1),
        end: formatMonthKey(currentYear - 1, 12),
      }),
    },
    {
      id: 'custom',
      label: 'Custom',
      getRange: () => {
        const current = getCurrentMonthKey();
        return { start: current, end: current };
      },
    },
  ];
}

/**
 * Determine which preset matches the current range
 */
export function detectActivePreset(
  startMonth: MonthKey,
  endMonth: MonthKey,
  presets: DateRangePreset[]
): PresetId {
  for (const preset of presets) {
    if (preset.id === 'custom') continue;
    const { start, end } = preset.getRange();
    if (start === startMonth && end === endMonth) {
      return preset.id;
    }
  }
  return 'custom';
}

/**
 * Format month for display (e.g., "Jan 2024")
 */
export function formatMonthDisplay(monthKey: MonthKey): string {
  const { year, month } = parseMonthKey(monthKey);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * Navigate to previous/next month
 */
export function navigateMonth(monthKey: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(monthKey);
  const date = new Date(year, month - 1 + delta, 1);
  return formatMonthKey(date.getFullYear(), date.getMonth() + 1);
}

/**
 * Calculate months difference between two month keys
 */
export function getMonthDifference(from: MonthKey, to: MonthKey): number {
  const fromParts = parseMonthKey(from);
  const toParts = parseMonthKey(to);
  return (toParts.year - fromParts.year) * 12 + (toParts.month - fromParts.month);
}

/**
 * Calculate year range based on notes and minimum range
 */
export function calculateYearRange(
  currentYear: number,
  yearsWithNotes: readonly number[],
  minRange: number
): number[] {
  const allYears = new Set([currentYear, ...yearsWithNotes]);

  // Ensure minimum range
  for (let i = 1; i <= minRange; i++) {
    allYears.add(currentYear - i);
    allYears.add(currentYear + i);
  }

  return Array.from(allYears).sort((a, b) => a - b);
}
