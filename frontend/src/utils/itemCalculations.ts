/**
 * Item Calculations
 *
 * Single source of truth for computing derived values from raw recurring item data.
 * This consolidates logic previously split between backend (Python) and frontend (TypeScript).
 *
 * Raw data comes from Monarch API via backend. All derived values are computed here.
 */

import {
  calculateMonthlyTarget,
  getFrequencyMonths,
  roundMonthlyRate,
  type Frequency,
} from './calculations';
import type {
  RecurringItem,
  RollupItem,
  RollupData,
  DashboardData,
  DashboardSummary,
} from '../types';
import type { ItemStatus } from '../types/common';

/**
 * Get the current month as ISO string (YYYY-MM-DD)
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Calculate ideal monthly rate (amount / frequency_months)
 */
function calculateIdealMonthlyRate(amount: number, frequencyMonths: number): number {
  if (frequencyMonths <= 0) return amount;
  return roundMonthlyRate(amount / frequencyMonths);
}

/**
 * Calculate progress percent (current_balance / amount * 100)
 */
function calculateProgressPercent(currentBalance: number, amount: number): number {
  if (amount <= 0) return 100;
  return Math.min(100, Math.max(0, (currentBalance / amount) * 100));
}

/**
 * Determine item status based on savings progress
 */
function calculateStatus(
  currentBalance: number,
  amount: number,
  monthlyContribution: number,
  idealMonthlyRate: number,
  monthsUntilDue: number,
  isEnabled: boolean,
  frequencyMonths: number
): ItemStatus {
  if (!isEnabled) {
    return 'inactive';
  }

  // Fully funded
  if (currentBalance >= amount) {
    return 'funded';
  }

  // Due now or past due
  if (monthsUntilDue <= 0) {
    return 'due_now';
  }

  // For sub-monthly, check if on track
  if (frequencyMonths < 1) {
    const shortfall = amount - currentBalance;
    const amountNeeded = shortfall - idealMonthlyRate * Math.max(1, monthsUntilDue);
    if (amountNeeded > 0) {
      return 'critical';
    }
    return 'on_track';
  }

  // Compare monthly contribution to ideal rate
  if (monthlyContribution <= idealMonthlyRate * 0.9) {
    return 'ahead';
  } else if (monthlyContribution <= idealMonthlyRate * 1.1) {
    return 'on_track';
  } else {
    return 'behind';
  }
}

/**
 * Calculate amount needed now to get back on track
 */
function calculateAmountNeededNow(
  currentBalance: number,
  amount: number,
  idealMonthlyRate: number,
  monthsUntilDue: number,
  frequencyMonths: number
): number {
  if (currentBalance >= amount) return 0;
  if (monthsUntilDue <= 0) return Math.max(0, amount - currentBalance);

  const shortfall = amount - currentBalance;

  if (frequencyMonths < 1) {
    // Sub-monthly
    return Math.max(0, shortfall - idealMonthlyRate * Math.max(1, monthsUntilDue));
  }

  return 0;
}

/**
 * Calculate monthly contribution (shortfall / months_remaining)
 */
function calculateMonthlyContribution(
  currentBalance: number,
  amount: number,
  monthsUntilDue: number,
  frequencyMonths: number,
  idealMonthlyRate: number
): number {
  if (currentBalance >= amount) return 0;

  const shortfall = amount - currentBalance;

  // Sub-monthly: use ideal rate
  if (frequencyMonths < 1) {
    return idealMonthlyRate;
  }

  // Due now
  if (monthsUntilDue <= 0) {
    return roundMonthlyRate(shortfall);
  }

  // Spread over remaining months
  return roundMonthlyRate(shortfall / monthsUntilDue);
}

/**
 * Calculate over-contribution (excess beyond target)
 */
function calculateOverContribution(currentBalance: number, amount: number): number {
  if (currentBalance > amount) {
    return currentBalance - amount;
  }
  return 0;
}

/**
 * Compute all derived values for a recurring item.
 * Takes a partial item (from API) and returns a fully computed RecurringItem.
 */
export function computeItemValues(
  raw: Partial<RecurringItem> & {
    id: string;
    name: string;
    amount: number;
    frequency: string;
    next_due_date: string;
    current_balance: number;
    planned_budget: number;
    is_enabled: boolean;
    months_until_due: number;
  }
): RecurringItem {
  const targetMonth = getCurrentMonth();
  const frequencyMonths = raw.frequency_months || getFrequencyMonths(raw.frequency as Frequency);

  // Use Monarch's rollover directly (previousMonthRolloverAmount)
  // This is the true start-of-month balance before any budgeting this month
  const rolloverAmount = raw.rollover_amount ?? 0;

  // Calculate frozen monthly target using baseDate-based occurrence calculator
  const frozenMonthlyTarget = calculateMonthlyTarget(
    raw.base_date || raw.next_due_date,
    raw.frequency as Frequency,
    raw.amount,
    rolloverAmount,
    targetMonth
  );

  // Calculate ideal monthly rate
  const idealMonthlyRate = calculateIdealMonthlyRate(raw.amount, frequencyMonths);

  // Calculate progress target
  // For sub-monthly items (weekly, bi-weekly), use total monthly obligation
  // For >= 1 month items (monthly, quarterly, annual), use the full bill amount
  const progressTarget = frequencyMonths < 1 ? frozenMonthlyTarget + rolloverAmount : raw.amount;

  // Calculate progress percent using the appropriate target
  const progressPercent = calculateProgressPercent(raw.current_balance, progressTarget);

  // Calculate monthly contribution
  const monthlyContribution = calculateMonthlyContribution(
    raw.current_balance,
    raw.amount,
    raw.months_until_due,
    frequencyMonths,
    idealMonthlyRate
  );

  // Calculate over-contribution
  const overContribution = calculateOverContribution(raw.current_balance, raw.amount);

  // Calculate status
  const status = calculateStatus(
    raw.current_balance,
    raw.amount,
    monthlyContribution,
    idealMonthlyRate,
    raw.months_until_due,
    raw.is_enabled,
    frequencyMonths
  );

  // Calculate amount needed now
  const amountNeededNow = calculateAmountNeededNow(
    raw.current_balance,
    raw.amount,
    idealMonthlyRate,
    raw.months_until_due,
    frequencyMonths
  );

  // Calculate contributed this month and monthly progress
  const contributedThisMonth = Math.max(0, raw.planned_budget);
  const monthlyProgressPercent =
    frozenMonthlyTarget > 0 ? (contributedThisMonth / frozenMonthlyTarget) * 100 : 100;

  const result: RecurringItem = {
    // Pass through raw values with defaults
    id: raw.id,
    merchant_id: raw.merchant_id ?? null,
    logo_url: raw.logo_url ?? null,
    is_stale: raw.is_stale ?? false,
    name: raw.name,
    category_name: raw.category_name ?? '',
    category_id: raw.category_id ?? null,
    category_group_name: raw.category_group_name ?? null,
    category_missing: raw.category_missing ?? false,
    amount: raw.amount,
    frequency: raw.frequency,
    frequency_months: frequencyMonths,
    next_due_date: raw.next_due_date,
    months_until_due: raw.months_until_due,
    current_balance: raw.current_balance,
    planned_budget: raw.planned_budget,
    is_enabled: raw.is_enabled,
    // Computed values
    frozen_monthly_target: frozenMonthlyTarget,
    ideal_monthly_rate: idealMonthlyRate,
    progress_percent: progressPercent,
    progress_target: progressTarget,
    status,
    amount_needed_now: amountNeededNow,
    contributed_this_month: contributedThisMonth,
    monthly_progress_percent: monthlyProgressPercent,
    monthly_contribution: monthlyContribution,
    over_contribution: overContribution,
  };

  // Only include optional properties if they have values
  if (raw.base_date !== undefined) result.base_date = raw.base_date;
  if (raw.is_in_rollup !== undefined) result.is_in_rollup = raw.is_in_rollup;
  if (raw.emoji !== undefined) result.emoji = raw.emoji;

  return result;
}

/**
 * Compute values for a rollup item.
 * Takes a partial item (from API) and returns a fully computed RollupItem.
 */
export function computeRollupItemValues(
  raw: Partial<RollupItem> & {
    id: string;
    name: string;
    amount: number;
    frequency: string;
    next_due_date: string;
    months_until_due: number;
    current_balance?: number;
    rollover_amount?: number;
  }
): RollupItem {
  const targetMonth = getCurrentMonth();
  const frequencyMonths = raw.frequency_months || getFrequencyMonths(raw.frequency as Frequency);

  // For rollup items, use proportional rollover if available
  const rolloverAmount = raw.rollover_amount ?? raw.current_balance ?? 0;

  const frozenMonthlyTarget = calculateMonthlyTarget(
    raw.base_date || raw.next_due_date,
    raw.frequency as Frequency,
    raw.amount,
    rolloverAmount,
    targetMonth
  );

  const idealMonthlyRate = calculateIdealMonthlyRate(raw.amount, frequencyMonths);

  // Determine status based on frozen vs ideal
  let status: ItemStatus = 'on_track';
  const currentBalance = raw.current_balance ?? 0;
  if (currentBalance >= raw.amount) {
    status = 'funded';
  } else if (frozenMonthlyTarget > idealMonthlyRate * 1.1) {
    status = 'behind';
  } else if (frozenMonthlyTarget < idealMonthlyRate * 0.9) {
    status = 'ahead';
  }

  const result: RollupItem = {
    id: raw.id,
    name: raw.name,
    merchant_id: raw.merchant_id ?? null,
    logo_url: raw.logo_url ?? null,
    amount: raw.amount,
    frequency: raw.frequency,
    frequency_months: frequencyMonths,
    next_due_date: raw.next_due_date,
    months_until_due: raw.months_until_due,
    ideal_monthly_rate: idealMonthlyRate,
    frozen_monthly_target: frozenMonthlyTarget,
    status,
  };

  // Only include optional properties if they have values
  if (raw.base_date !== undefined) result.base_date = raw.base_date;

  return result;
}

/**
 * Transform dashboard data by recomputing all derived values.
 * This is the single source of truth for calculations.
 *
 * Backend sends raw + computed values, but we recompute here to ensure
 * frontend calculations are authoritative.
 */
export function transformDashboardData(data: DashboardData): DashboardData {
  // Recompute item values
  const computedItems: RecurringItem[] = data.items.map((item) => computeItemValues(item));

  // Recompute rollup if present and enabled
  let computedRollup: RollupData = data.rollup;
  if (data.rollup?.enabled && data.rollup.items) {
    const rollupItems: RollupItem[] = data.rollup.items.map((item) => {
      // Extract extra properties that may be on the API response but not in RollupItem type
      const apiItem = item as RollupItem & { current_balance?: number; rollover_amount?: number };
      // Build input for computation
      const input: Parameters<typeof computeRollupItemValues>[0] = {
        ...item,
      };
      // Only add optional properties if they exist
      if (apiItem.current_balance !== undefined) input.current_balance = apiItem.current_balance;
      if (apiItem.rollover_amount !== undefined) input.rollover_amount = apiItem.rollover_amount;
      return computeRollupItemValues(input);
    });

    const totalFrozenMonthly = rollupItems.reduce((sum, i) => sum + i.frozen_monthly_target, 0);
    const totalIdealRate = rollupItems.reduce((sum, i) => sum + i.ideal_monthly_rate, 0);

    computedRollup = {
      ...data.rollup,
      items: rollupItems,
      total_frozen_monthly: totalFrozenMonthly,
      total_ideal_rate: totalIdealRate,
    };
  }

  // Recompute summary
  let computedSummary: DashboardSummary = data.summary;
  if (data.summary) {
    const enabledItems = computedItems.filter((i) => i.is_enabled && !i.is_in_rollup);
    const totalMonthly =
      enabledItems.reduce((sum, i) => sum + i.frozen_monthly_target, 0) +
      (computedRollup?.enabled ? computedRollup.total_frozen_monthly : 0);

    computedSummary = {
      ...data.summary,
      total_monthly_contribution: totalMonthly,
    };
  }

  return {
    ...data,
    items: computedItems,
    rollup: computedRollup,
    summary: computedSummary,
  };
}
