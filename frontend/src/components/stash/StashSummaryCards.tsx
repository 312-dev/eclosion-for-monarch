/**
 * StashSummaryCards - Summary metric cards for stash reports
 *
 * Displays 4 key metrics:
 * - Total Stashed (current balance across all stashes)
 * - Total Targets (sum of all target amounts)
 * - This Month (net contributions for current month)
 * - Remaining (targets - stashed)
 */

import { formatCurrency } from '../../utils/formatters';
import type { StashHistoryResponse } from '../../types';

interface StashSummaryCardsProps {
  /** Stash history data */
  readonly data: StashHistoryResponse;
  /** IDs of visible stashes (for filtering) */
  readonly visibleStashIds: string[];
}

interface SummaryMetrics {
  totalStashed: number;
  totalTargets: number;
  thisMonth: number;
  remaining: number;
  totalStashedChange: number | null;
  totalTargetsChange: number | null;
  thisMonthChange: number | null;
  remainingChange: number | null;
}

/**
 * Calculate summary metrics from stash history data.
 */
function calculateMetrics(data: StashHistoryResponse, visibleStashIds: string[]): SummaryMetrics {
  // Filter to visible stashes only
  const visibleItems = data.items.filter((item) => visibleStashIds.includes(item.id));

  // Get current and previous month data
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Calculate previous month
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  // Total stashed: sum of current balances (latest month)
  const totalStashed = visibleItems.reduce((sum, item) => {
    const latestMonth = item.months.at(-1);
    return sum + (latestMonth?.balance ?? 0);
  }, 0);

  // Previous total stashed
  const prevTotalStashed = visibleItems.reduce((sum, item) => {
    const prevMonth = item.months.find((m) => m.month === previousMonth);
    return sum + (prevMonth?.balance ?? 0);
  }, 0);

  const totalStashedChange =
    prevTotalStashed > 0 ? ((totalStashed - prevTotalStashed) / prevTotalStashed) * 100 : null;

  // Total targets: sum of all target amounts (targets don't change month to month, so no percentage)
  const totalTargets = visibleItems.reduce((sum, item) => sum + item.target_amount, 0);

  // This month: sum of contributions for the current month
  const thisMonth = visibleItems.reduce((sum, item) => {
    const currentMonthData = item.months.find((m) => m.month === currentMonth);
    return sum + (currentMonthData?.contribution ?? 0);
  }, 0);

  // Previous month contributions
  const prevMonthContribution = visibleItems.reduce((sum, item) => {
    const prevMonthData = item.months.find((m) => m.month === previousMonth);
    return sum + (prevMonthData?.contribution ?? 0);
  }, 0);

  const thisMonthChange =
    prevMonthContribution === 0
      ? null
      : ((thisMonth - prevMonthContribution) / Math.abs(prevMonthContribution)) * 100;

  // Remaining: targets - stashed
  const remaining = totalTargets - totalStashed;
  const prevRemaining = totalTargets - prevTotalStashed;

  const remainingChange =
    prevRemaining === 0 ? null : ((remaining - prevRemaining) / Math.abs(prevRemaining)) * 100;

  return {
    totalStashed,
    totalTargets,
    thisMonth,
    remaining,
    totalStashedChange,
    totalTargetsChange: null, // Targets don't change
    thisMonthChange,
    remainingChange,
  };
}

/** Currency formatting options for whole dollars */
const currencyOpts = { maximumFractionDigits: 0 };

/**
 * Format percentage change (without parentheses).
 */
function formatPercentage(percentage: number | null): string | null {
  if (percentage === null) return null;
  const sign = percentage > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(2)}%`;
}

/**
 * Get color for the "This Month" contribution amount.
 */
function getThisMonthColor(amount: number): string {
  if (amount > 0) return 'var(--monarch-success)';
  if (amount < 0) return 'var(--monarch-warning)';
  return 'var(--monarch-text-dark)';
}

/**
 * Get color for percentage change.
 * Positive changes are green (success), negative changes are orange (warning).
 */
function getPercentageColor(percentage: number | null, inverseColors: boolean = false): string {
  if (percentage === null || percentage === 0) return 'var(--monarch-text-muted)';

  const isPositive = percentage > 0;
  if (inverseColors) {
    // For "remaining", decreasing is good (getting closer to goal)
    return isPositive ? 'var(--monarch-warning)' : 'var(--monarch-success)';
  }
  // For most metrics, increasing is good
  return isPositive ? 'var(--monarch-success)' : 'var(--monarch-warning)';
}

export function StashSummaryCards({ data, visibleStashIds }: StashSummaryCardsProps) {
  const metrics = calculateMetrics(data, visibleStashIds);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Stashed */}
      <div
        className="rounded-lg p-6 flex flex-col section-enter"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            Total committed
          </div>
          {metrics.totalStashedChange !== null && (
            <div
              className="text-sm font-medium"
              style={{ color: getPercentageColor(metrics.totalStashedChange) }}
            >
              {formatPercentage(metrics.totalStashedChange)}
            </div>
          )}
        </div>
        <div className="text-4xl font-semibold" style={{ color: 'var(--monarch-success)' }}>
          {formatCurrency(metrics.totalStashed, currencyOpts)}
        </div>
      </div>

      {/* Total Targets */}
      <div
        className="rounded-lg p-6 flex flex-col section-enter"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            Total targets
          </div>
        </div>
        <div className="text-4xl font-semibold" style={{ color: 'white' }}>
          {formatCurrency(metrics.totalTargets, currencyOpts)}
        </div>
      </div>

      {/* This Month */}
      <div
        className="rounded-lg p-6 flex flex-col section-enter"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            Net change
          </div>
          {metrics.thisMonthChange !== null && (
            <div
              className="text-sm font-medium"
              style={{ color: getPercentageColor(metrics.thisMonthChange) }}
            >
              {formatPercentage(metrics.thisMonthChange)}
            </div>
          )}
        </div>
        <div
          className="text-4xl font-semibold"
          style={{ color: getThisMonthColor(metrics.thisMonth) }}
        >
          {formatCurrency(metrics.thisMonth, currencyOpts)}
        </div>
      </div>

      {/* Remaining */}
      <div
        className="rounded-lg p-6 flex flex-col section-enter"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            {metrics.remaining > 0 ? 'Left to save' : 'Goal reached'}
          </div>
          {metrics.remainingChange !== null && (
            <div
              className="text-sm font-medium"
              style={{ color: getPercentageColor(metrics.remainingChange, true) }}
            >
              {formatPercentage(metrics.remainingChange)}
            </div>
          )}
        </div>
        <div className="text-4xl font-semibold" style={{ color: 'white' }}>
          {formatCurrency(metrics.remaining, currencyOpts)}
        </div>
      </div>
    </div>
  );
}
