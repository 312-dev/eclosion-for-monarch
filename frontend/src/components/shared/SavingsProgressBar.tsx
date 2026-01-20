/**
 * SavingsProgressBar - Shared progress bar for savings goals
 *
 * Used by both Recurring items and Wishlist items to display
 * savings progress with consistent styling.
 */

import type { ItemStatus } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { formatCurrency, getStatusStyles } from '../../utils';

interface SavingsProgressBarProps {
  /** Current total saved amount */
  readonly totalSaved: number;
  /** Target amount to reach */
  readonly targetAmount: number;
  /** Progress percentage (0-100) */
  readonly progressPercent: number;
  /** Display status for color styling */
  readonly displayStatus: ItemStatus;
  /** Whether the item is enabled */
  readonly isEnabled: boolean;
  /** Optional rollover amount from previous month */
  readonly rolloverAmount?: number;
  /** Optional budgeted amount this month */
  readonly budgetedThisMonth?: number;
  /** Optional label for saved text (default: "saved") */
  readonly savedLabel?: string;
}

export function SavingsProgressBar({
  totalSaved,
  targetAmount,
  progressPercent,
  displayStatus,
  isEnabled,
  rolloverAmount = 0,
  budgetedThisMonth = 0,
  savedLabel = 'saved',
}: SavingsProgressBarProps) {
  const hasRollover = rolloverAmount > 0;

  if (!isEnabled) {
    return null;
  }

  return (
    <div>
      <div className="w-full rounded-full h-1.5 bg-neutral-600">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{
            width: `${Math.min(progressPercent, 100)}%`,
            backgroundColor: getStatusStyles(displayStatus, isEnabled).color,
          }}
        />
      </div>
      <div className="text-xs mt-0.5 flex justify-between">
        {hasRollover ? (
          <Tooltip
            content={
              <>
                <div>
                  {formatCurrency(rolloverAmount, { maximumFractionDigits: 0 })} rolled over
                </div>
                <div>
                  {formatCurrency(budgetedThisMonth, { maximumFractionDigits: 0 })} budgeted this
                  month
                </div>
              </>
            }
          >
            <span className="text-monarch-text-dark cursor-help underline decoration-dotted underline-offset-2">
              {formatCurrency(totalSaved, { maximumFractionDigits: 0 })} {savedLabel}
            </span>
          </Tooltip>
        ) : (
          <span className="text-monarch-text-dark">
            {formatCurrency(totalSaved, { maximumFractionDigits: 0 })} {savedLabel}
          </span>
        )}
        <span className="text-monarch-text-light">
          {formatCurrency(Math.max(0, targetAmount - totalSaved), { maximumFractionDigits: 0 })} to go
        </span>
      </div>
    </div>
  );
}
