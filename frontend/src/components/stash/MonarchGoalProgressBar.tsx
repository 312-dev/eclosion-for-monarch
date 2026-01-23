/**
 * MonarchGoalProgressBar - Progress bar for Monarch savings goals
 *
 * Displays time-based progress with a vertical marker showing expected progress.
 * This is DISTINCT from SavingsProgressBar used by Stash items.
 *
 * Key differences:
 * - Uses time-based progress (not budget vs target)
 * - Shows vertical marker for expected progress based on time elapsed
 * - Different color scheme matching Monarch's goal status
 */

import type { MonarchGoal } from '../../types/monarchGoal';
import { formatCurrency } from '../../utils';
import { Tooltip } from '../ui/Tooltip';

interface MonarchGoalProgressBarProps {
  /** Current balance toward goal (available after spending) */
  readonly currentBalance: number;
  /** Total amount saved (for display - includes spent amounts) */
  readonly netContribution: number;
  /** Target amount (can be null for goals without targets) */
  readonly targetAmount: number | null;
  /** Progress percentage from Monarch API (0-100+) */
  readonly progress: number;
  /** Goal status */
  readonly status: MonarchGoal['status'];
}

/** Status colors for progress bar */
const STATUS_COLORS = {
  ahead: '#10b981', // Green
  on_track: '#3b82f6', // Blue
  at_risk: '#fbbf24', // Yellow
  completed: '#10b981', // Green
  no_target: '#10b981', // Green - "save as you go" goals are always fully funded
} as const;

export function MonarchGoalProgressBar({
  currentBalance,
  netContribution,
  targetAmount,
  progress,
  status,
}: MonarchGoalProgressBarProps) {
  // If no target amount, show as fully funded
  const hasTarget = targetAmount !== null && targetAmount > 0;
  const actualProgress = hasTarget ? Math.min(progress, 100) : 100;
  const progressColor = STATUS_COLORS[status];
  // "To go" is based on net contribution, not current balance
  // This matches the "saved" display (netContribution) for consistency
  const remaining = hasTarget ? Math.max(0, targetAmount - netContribution) : 0;

  return (
    <div>
      {/* Progress bar */}
      <div
        className="w-full rounded-full h-1.5"
        style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${actualProgress}%`,
            backgroundColor: progressColor,
          }}
        />
      </div>

      {/* Progress text */}
      <div className="text-xs mt-0.5 flex justify-between" style={{ color: 'var(--monarch-text-muted)' }}>
        <div>
          {/* Show "available" and "saved" with tooltips when they differ, otherwise just show plain "saved" */}
          {currentBalance === netContribution ? (
            // No spending or credits - just show plain "saved"
            <span className="text-monarch-text-dark">
              {formatCurrency(netContribution, { maximumFractionDigits: 0 })} saved
            </span>
          ) : (
            // Has spending or credits - show tooltips
            <>
              {/* Available tooltip */}
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
                          +{formatCurrency(netContribution, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      {netContribution > currentBalance ? (
                        // Spending occurred
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--monarch-text-muted)' }}>Spent</span>
                          <span style={{ color: 'var(--monarch-red)' }}>
                            -{formatCurrency(netContribution - currentBalance, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      ) : (
                        // Credits/refunds occurred
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--monarch-text-muted)' }}>Credits</span>
                          <span style={{ color: 'var(--monarch-green)' }}>
                            +{formatCurrency(currentBalance - netContribution, { maximumFractionDigits: 0 })}
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
                        {formatCurrency(currentBalance, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                }
              >
                <span
                  className="text-monarch-text-dark cursor-help"
                  style={{ borderBottom: '1px dotted var(--monarch-text-muted)' }}
                >
                  {formatCurrency(currentBalance, { maximumFractionDigits: 0 })} available
                </span>
              </Tooltip>
              <span className="text-monarch-text-dark">, </span>

              {/* Saved tooltip (only when there's spending/credits) */}
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
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--monarch-text-muted)' }}>Total contributed</span>
                        <span style={{ color: 'var(--monarch-green)' }}>
                          +{formatCurrency(netContribution, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                    <div
                      className="flex justify-between font-medium pt-2 border-t"
                      style={{ borderColor: 'var(--monarch-border)' }}
                    >
                      <span>Total Saved</span>
                      <span style={{ color: 'var(--monarch-text-dark)' }}>
                        {formatCurrency(netContribution, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                }
              >
                <span
                  className="text-monarch-text-dark cursor-help"
                  style={{ borderBottom: '1px dotted var(--monarch-text-muted)' }}
                >
                  {formatCurrency(netContribution, { maximumFractionDigits: 0 })} saved
                </span>
              </Tooltip>
            </>
          )}
        </div>
        {hasTarget && (
          <Tooltip
            content={
              <div className="text-sm space-y-2 min-w-56">
                <div
                  className="font-medium border-b pb-1 mb-2"
                  style={{ borderColor: 'var(--monarch-border)' }}
                >
                  Goal Progress
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--monarch-text-muted)' }}>Target</span>
                    <span style={{ color: 'var(--monarch-text-dark)' }}>
                      {formatCurrency(targetAmount, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--monarch-text-muted)' }}>Saved</span>
                    <span style={{ color: 'var(--monarch-green)' }}>
                      {formatCurrency(netContribution, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
                <div
                  className="flex justify-between font-medium pt-2 border-t"
                  style={{ borderColor: 'var(--monarch-border)' }}
                >
                  <span>Remaining</span>
                  <span style={{ color: 'var(--monarch-text-dark)' }}>
                    {formatCurrency(remaining, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            }
          >
            <span
              className="cursor-help"
              style={{ borderBottom: '1px dotted var(--monarch-text-muted)' }}
            >
              {formatCurrency(remaining, { maximumFractionDigits: 0 })} to go
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
