/**
 * SavingsProgressBar - Shared progress bar for savings goals
 *
 * Used by both Recurring items and Stash items to display
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
  /** Optional rollover amount from previous month (from Monarch) */
  readonly rolloverAmount?: number;
  /** Optional budgeted amount this month */
  readonly budgetedThisMonth?: number;
  /** Optional credits (positive transactions) this month */
  readonly creditsThisMonth?: number;
  /** Optional label for saved text (default: "saved") */
  readonly savedLabel?: string;
  /** Goal type - used to show additional context in tooltip */
  readonly goalType?: 'one_time' | 'savings_buffer';
  /** Available to spend (for one_time goals, helps detect if spending occurred) */
  readonly availableToSpend?: number;
}

export function SavingsProgressBar({
  totalSaved,
  targetAmount,
  progressPercent,
  displayStatus,
  isEnabled,
  rolloverAmount = 0,
  budgetedThisMonth = 0,
  creditsThisMonth = 0,
  savedLabel = 'saved',
  goalType,
  availableToSpend,
}: SavingsProgressBarProps) {
  // Show tooltip breakdown when there's data to show
  const priorBalance = Math.max(0, totalSaved - budgetedThisMonth);
  const hasBreakdown = priorBalance > 0 || creditsThisMonth > 0 || budgetedThisMonth > 0;

  // For one_time goals, detect if spending has occurred (balance < progress)
  const hasSpending =
    goalType === 'one_time' &&
    availableToSpend !== undefined &&
    availableToSpend !== totalSaved;

  // Calculate spending amount (progress - actual balance)
  const spendingAmount = hasSpending && availableToSpend !== undefined
    ? totalSaved - availableToSpend
    : 0;

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
        <div>
          {/* Show "available" first when there's spending */}
          {hasSpending && availableToSpend !== undefined && (
            <>
              <Tooltip
                content={
                  <div className="text-sm space-y-2 min-w-56">
                    <div
                      className="font-medium border-b pb-1 mb-2"
                      style={{ borderColor: 'var(--monarch-border)' }}
                    >
                      Available Breakdown
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--monarch-text-muted)' }}>Total saved</span>
                        <span style={{ color: 'var(--monarch-green)' }}>
                          +{formatCurrency(totalSaved, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      {spendingAmount > 0 && (
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--monarch-text-muted)' }}>Spent</span>
                          <span style={{ color: 'var(--monarch-red)' }}>
                            -{formatCurrency(spendingAmount, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      )}
                    </div>
                    <div
                      className="flex justify-between font-medium pt-2 border-t"
                      style={{ borderColor: 'var(--monarch-border)' }}
                    >
                      <span>Available</span>
                      <span style={{ color: 'var(--monarch-text-dark)' }}>
                        {formatCurrency(availableToSpend, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                }
              >
                <span
                  className="text-monarch-text-dark cursor-help"
                  style={{ borderBottom: '1px dotted var(--monarch-text-muted)' }}
                >
                  {formatCurrency(availableToSpend, { maximumFractionDigits: 0 })} available
                </span>
              </Tooltip>
              <span className="text-monarch-text-dark">, </span>
            </>
          )}

          {/* Show "saved" with balance breakdown tooltip */}
          {hasBreakdown ? (
            <Tooltip
              content={
                <div className="text-sm space-y-2 min-w-56">
                  <div
                    className="font-medium border-b pb-1 mb-2"
                    style={{ borderColor: 'var(--monarch-border)' }}
                  >
                    Balance Breakdown
                  </div>
                  <div className="space-y-1">
                    {rolloverAmount > 0 ? (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--monarch-text-muted)' }}>Rolled over</span>
                        <span style={{ color: 'var(--monarch-green)' }}>
                          +{formatCurrency(rolloverAmount, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ) : (
                      priorBalance > 0 &&
                      creditsThisMonth === 0 && (
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--monarch-text-muted)' }}>Prior balance</span>
                          <span style={{ color: 'var(--monarch-green)' }}>
                            +{formatCurrency(priorBalance, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      )
                    )}
                    {creditsThisMonth > 0 && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--monarch-text-muted)' }}>Credits this month</span>
                        <span style={{ color: 'var(--monarch-green)' }}>
                          +{formatCurrency(creditsThisMonth, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--monarch-text-muted)' }}>Budgeted this month</span>
                      <span style={{ color: 'var(--monarch-green)' }}>
                        +{formatCurrency(budgetedThisMonth, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex justify-between font-medium pt-2 border-t"
                    style={{ borderColor: 'var(--monarch-border)' }}
                  >
                    <span>Total Saved</span>
                    <span style={{ color: 'var(--monarch-text-dark)' }}>
                      {formatCurrency(totalSaved, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              }
            >
              <span
                className="text-monarch-text-dark cursor-help"
                style={{ borderBottom: '1px dotted var(--monarch-text-muted)' }}
              >
                {formatCurrency(totalSaved, { maximumFractionDigits: 0 })} {savedLabel}
              </span>
            </Tooltip>
          ) : (
            <span className="text-monarch-text-dark">
              {formatCurrency(totalSaved, { maximumFractionDigits: 0 })} {savedLabel}
            </span>
          )}
        </div>
        <span className="text-monarch-text-light">
          {formatCurrency(Math.max(0, targetAmount - totalSaved), { maximumFractionDigits: 0 })} to
          go
        </span>
      </div>
    </div>
  );
}
