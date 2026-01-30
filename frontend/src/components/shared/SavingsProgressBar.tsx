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
  /** Display status for color styling (optional if progressColor is provided) */
  readonly displayStatus?: ItemStatus;
  /** Whether the item is enabled (defaults to true) */
  readonly isEnabled?: boolean;
  /** Optional rollover amount from previous month (from Monarch) */
  readonly rolloverAmount?: number;
  /** Optional budgeted amount this month */
  readonly budgetedThisMonth?: number;
  /** Optional credits (positive transactions) this month */
  readonly creditsThisMonth?: number;
  /** Optional label for saved text (default: "saved") */
  readonly savedLabel?: string;
  /** Goal type - used to show additional context in tooltip */
  readonly goalType?: 'one_time' | 'debt' | 'savings_buffer';
  /** Available to spend (for one_time goals, helps detect if spending occurred) */
  readonly availableToSpend?: number;
  /** Optional explicit progress color (overrides displayStatus-based color) */
  readonly progressColor?: string;
}

export function SavingsProgressBar({
  totalSaved,
  targetAmount,
  progressPercent,
  displayStatus,
  isEnabled = true,
  rolloverAmount = 0,
  budgetedThisMonth = 0,
  creditsThisMonth = 0,
  savedLabel = 'saved',
  goalType,
  availableToSpend,
  progressColor,
}: SavingsProgressBarProps) {
  // For savings_buffer goals:
  // - "saved" = total contributions (rollover + budgeted + credits)
  // - "available" = remaining after spending (totalSaved is the remaining balance)
  // - spending = contributions - available
  //
  // For one_time goals:
  // - "saved" = totalSaved (total ever budgeted, immune to spending)
  // - "available" = availableToSpend (current balance after spending)
  // - spending = saved - available

  const isSavingsBuffer = goalType === 'savings_buffer';

  // Calculate total contributions (what was "saved" / put in)
  const totalContributions = rolloverAmount + budgetedThisMonth + creditsThisMonth;

  // For savings_buffer: totalSaved from props is actually the remaining balance
  // For one_time: totalSaved from props is total contributions
  const displayedAvailable = isSavingsBuffer ? totalSaved : availableToSpend;

  // Calculate spending
  let spentThisMonth = 0;
  if (isSavingsBuffer) {
    spentThisMonth = Math.max(0, totalContributions - totalSaved);
  } else if (availableToSpend !== undefined) {
    spentThisMonth = Math.max(0, totalSaved - availableToSpend);
  }

  // Detect if there's spending to show the "available" display
  const hasSpendingToShow = spentThisMonth > 0 && displayedAvailable !== undefined;

  // Show tooltip breakdown when there's data to show
  const hasBreakdown = rolloverAmount > 0 || creditsThisMonth > 0 || budgetedThisMonth > 0;

  if (!isEnabled) {
    return null;
  }

  // The saved amount to display and use for "to go" calculation
  const savedForDisplay = isSavingsBuffer ? totalContributions : totalSaved;

  return (
    <div>
      <div className="w-full rounded-full h-1.5 bg-neutral-600">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{
            width: `${Math.min(progressPercent, 100)}%`,
            backgroundColor:
              progressColor ?? getStatusStyles(displayStatus ?? 'on_track', isEnabled).color,
          }}
        />
      </div>
      <div className="text-xs mt-0.5 flex justify-between">
        <div>
          {/* Show "available" first when there's spending */}
          {hasSpendingToShow && displayedAvailable !== undefined && (
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
                        <span style={{ color: 'var(--monarch-text-muted)' }}>Contributions</span>
                        <span style={{ color: 'var(--monarch-green)' }}>
                          +{formatCurrency(savedForDisplay, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      {spentThisMonth > 0 && (
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--monarch-text-muted)' }}>Spent</span>
                          <span style={{ color: 'var(--monarch-red)' }}>
                            -{formatCurrency(spentThisMonth, { maximumFractionDigits: 0 })}
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
                        {formatCurrency(displayedAvailable, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                }
              >
                <span
                  className="text-monarch-text-dark cursor-help"
                  style={{ borderBottom: '1px dotted var(--monarch-text-muted)' }}
                >
                  {formatCurrency(displayedAvailable, { maximumFractionDigits: 0 })} available
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
                    {rolloverAmount > 0 && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--monarch-text-muted)' }}>Rolled over</span>
                        <span style={{ color: 'var(--monarch-green)' }}>
                          +{formatCurrency(rolloverAmount, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    )}
                    {creditsThisMonth > 0 && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--monarch-text-muted)' }}>
                          Credits this month
                        </span>
                        <span style={{ color: 'var(--monarch-green)' }}>
                          +{formatCurrency(creditsThisMonth, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    )}
                    {budgetedThisMonth > 0 && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--monarch-text-muted)' }}>
                          Budgeted this month
                        </span>
                        <span style={{ color: 'var(--monarch-green)' }}>
                          +{formatCurrency(budgetedThisMonth, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    )}
                  </div>
                  <div
                    className="flex justify-between font-medium pt-2 border-t"
                    style={{ borderColor: 'var(--monarch-border)' }}
                  >
                    <span>Total Saved</span>
                    <span style={{ color: 'var(--monarch-text-dark)' }}>
                      {formatCurrency(savedForDisplay, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              }
            >
              <span
                className="text-monarch-text-dark cursor-help"
                style={{ borderBottom: '1px dotted var(--monarch-text-muted)' }}
              >
                {formatCurrency(savedForDisplay, { maximumFractionDigits: 0 })} {savedLabel}
              </span>
            </Tooltip>
          ) : (
            <span className="text-monarch-text-dark">
              {formatCurrency(savedForDisplay, { maximumFractionDigits: 0 })} {savedLabel}
            </span>
          )}
        </div>
        <span className="text-monarch-text-light">
          {formatCurrency(Math.max(0, targetAmount - savedForDisplay), {
            maximumFractionDigits: 0,
          })}{' '}
          to go
        </span>
      </div>
    </div>
  );
}
