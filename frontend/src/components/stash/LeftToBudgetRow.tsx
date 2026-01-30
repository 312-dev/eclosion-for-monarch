/**
 * LeftToBudgetRow Component
 *
 * A row displaying Left to Budget with hover tooltip showing calculation breakdown.
 */

import { HoverCard } from '../ui/HoverCard';
import { formatAvailableAmount } from '../../utils/availableToStash';

interface LeftToBudgetRowProps {
  readonly label: string;
  readonly amount: number;
  readonly income: number;
  readonly totalBudgeted: number;
  /** Savings & other amount (calculated: income - categories - LTB). Only shown if provided. */
  readonly savingsAndOther?: number;
}

/**
 * Left to Budget row with hover tooltip showing calculation breakdown.
 * Shows: Budgeted Income - Budgeted Categories - Savings & Other = LTB
 */
export function LeftToBudgetRow({
  label,
  amount,
  income,
  totalBudgeted,
  savingsAndOther,
}: LeftToBudgetRowProps) {
  // LTB is SUBTRACTED from available funds:
  // - Positive LTB (under-budgeted) reduces available → show as red/minus
  // - Negative LTB (over-budgeted) increases available → show as green/plus
  const isPositiveContribution = amount < 0;
  const color = isPositiveContribution ? 'var(--monarch-green)' : 'var(--monarch-red)';
  const displayAmount = Math.abs(amount);
  const sign = isPositiveContribution ? '+' : '-';

  // Running totals for the breakdown
  const runningTotals = {
    afterIncome: income,
    afterCategories: income - totalBudgeted,
    afterSavings: income - totalBudgeted - (savingsAndOther ?? 0),
  };

  const nestedTooltipContent = (
    <div className="text-xs max-w-72">
      <div
        className="font-medium pb-1 mb-1 border-b"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        {label} Breakdown
      </div>
      <div className="space-y-0.5">
        <div className="flex justify-between items-center gap-2">
          <span className="flex-1" style={{ color: 'var(--monarch-text-muted)' }}>
            Budgeted income
          </span>
          <span
            className="tabular-nums text-right"
            style={{ color: 'var(--monarch-green)', minWidth: '3.5rem' }}
          >
            +{formatAvailableAmount(income)}
          </span>
          <span
            className="tabular-nums text-right"
            style={{ color: 'var(--monarch-text-muted)', minWidth: '3.5rem', opacity: 0.7 }}
          >
            {formatAvailableAmount(runningTotals.afterIncome)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="flex-1" style={{ color: 'var(--monarch-text-muted)' }}>
            Budgeted categories
          </span>
          <span
            className="tabular-nums text-right"
            style={{ color: 'var(--monarch-red)', minWidth: '3.5rem' }}
          >
            -{formatAvailableAmount(totalBudgeted)}
          </span>
          <span
            className="tabular-nums text-right"
            style={{ color: 'var(--monarch-text-muted)', minWidth: '3.5rem', opacity: 0.7 }}
          >
            {formatAvailableAmount(runningTotals.afterCategories)}
          </span>
        </div>
        {savingsAndOther !== undefined && (
          <div className="flex justify-between items-center gap-2">
            <span className="flex-1" style={{ color: 'var(--monarch-text-muted)' }}>
              Savings & other
            </span>
            <span
              className="tabular-nums text-right"
              style={{ color: 'var(--monarch-red)', minWidth: '3.5rem' }}
            >
              -{formatAvailableAmount(savingsAndOther)}
            </span>
            <span
              className="tabular-nums text-right"
              style={{ color: 'var(--monarch-text-muted)', minWidth: '3.5rem', opacity: 0.7 }}
            >
              {formatAvailableAmount(runningTotals.afterSavings)}
            </span>
          </div>
        )}
        <div
          className="flex justify-between gap-4 pt-1 mt-1 border-t"
          style={{ borderColor: 'var(--monarch-border)' }}
        >
          <span style={{ color: 'var(--monarch-text-muted)' }}>= {label}</span>
          <span className="tabular-nums font-medium" style={{ color }}>
            {sign}
            {formatAvailableAmount(displayAmount)}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex justify-between">
      <span style={{ color: 'var(--monarch-text-muted)' }}>{label}</span>
      <HoverCard content={nestedTooltipContent} side="right" closeDelay={400}>
        <span
          className="cursor-help"
          style={{
            color,
            borderBottom: `1px dashed color-mix(in srgb, ${color} 40%, transparent)`,
            paddingBottom: '2px',
          }}
        >
          {sign}
          {formatAvailableAmount(displayAmount)}
        </span>
      </HoverCard>
    </div>
  );
}
