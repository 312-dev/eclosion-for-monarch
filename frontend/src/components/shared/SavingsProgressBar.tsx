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
  /** Optional expected progress percentage - shows a tick mark where progress should be (0-100) */
  readonly expectedProgressPercent?: number | null;
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
  expectedProgressPercent,
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

  const clampedPercent = Math.min(progressPercent, 100);

  // Use rewarding green for positive statuses, status colors for warnings/errors
  const status = displayStatus ?? 'on_track';
  const isPositiveStatus = status === 'funded' || status === 'on_track' || status === 'ahead';
  const fillColor =
    progressColor ??
    (isPositiveStatus ? 'var(--progress-bar-success)' : getStatusStyles(status, isEnabled).color);

  // Format amounts for display
  const savedAmount = formatCurrency(savedForDisplay, { maximumFractionDigits: 0 });
  const toGoAmount = formatCurrency(Math.max(0, targetAmount - savedForDisplay), {
    maximumFractionDigits: 0,
  });
  const availableAmount =
    displayedAvailable === undefined
      ? ''
      : formatCurrency(displayedAvailable, { maximumFractionDigits: 0 });

  // Shared content renderer for both text layers
  const renderContent = (textColor: string, labelColor: string) => (
    <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
      <span className="flex items-baseline gap-1">
        {hasSpendingToShow && availableAmount && (
          <>
            <span className="font-medium text-[15px]" style={{ color: textColor }}>
              {availableAmount}
            </span>
            <span className="text-xs" style={{ color: labelColor }}>
              avail
            </span>
            <span className="text-xs mx-0.5" style={{ color: labelColor }}>
              ·
            </span>
          </>
        )}
        <span className="font-medium text-[15px]" style={{ color: textColor }}>
          {savedAmount}
        </span>
        <span className="text-xs" style={{ color: labelColor }}>
          {savedLabel}
        </span>
      </span>
      <span className="flex items-baseline gap-1">
        <span className="font-medium text-[15px]" style={{ color: textColor }}>
          {toGoAmount}
        </span>
        <span className="text-xs" style={{ color: labelColor }}>
          to go
        </span>
      </span>
    </div>
  );

  // Tooltip content for saved breakdown
  const savedTooltipContent = hasBreakdown ? (
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
            <span style={{ color: 'var(--monarch-text-muted)' }}>Credits this month</span>
            <span style={{ color: 'var(--monarch-green)' }}>
              +{formatCurrency(creditsThisMonth, { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
        {budgetedThisMonth > 0 && (
          <div className="flex justify-between">
            <span style={{ color: 'var(--monarch-text-muted)' }}>Budgeted this month</span>
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
        <span style={{ color: 'var(--monarch-text-dark)' }}>{savedAmount}</span>
      </div>
      {hasSpendingToShow && spentThisMonth > 0 && (
        <>
          <div className="flex justify-between">
            <span style={{ color: 'var(--monarch-text-muted)' }}>Spent</span>
            <span style={{ color: 'var(--monarch-red)' }}>
              -{formatCurrency(spentThisMonth, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div
            className="flex justify-between font-medium pt-2 border-t"
            style={{ borderColor: 'var(--monarch-border)' }}
          >
            <span>Available</span>
            <span style={{ color: 'var(--monarch-text-dark)' }}>{availableAmount}</span>
          </div>
        </>
      )}
    </div>
  ) : null;

  const progressBar = (
    <div className="relative w-full">
      {/* Expected progress tick mark - positioned outside overflow container so it can extend */}
      {expectedProgressPercent != null &&
        expectedProgressPercent > 0 &&
        expectedProgressPercent < 100 && (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              left: `${expectedProgressPercent}%`,
              top: '-3px',
              bottom: '-3px',
              width: '1px',
              backgroundColor:
                clampedPercent >= expectedProgressPercent
                  ? 'rgba(255, 255, 255, 0.55)'
                  : 'rgba(0, 0, 0, 0.25)',
            }}
            title={`Expected: ${Math.round(expectedProgressPercent)}%`}
          />
        )}

      <div
        className="relative w-full h-8 rounded-lg overflow-hidden cursor-default"
        style={{
          backgroundColor: 'var(--progress-bar-track)',
        }}
      >
        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-lg transition-all"
          style={{
            width: `${clampedPercent}%`,
            backgroundColor: fillColor,
          }}
        />

        {/* Text layer 1: Muted text (visible on unfilled/background part) */}
        {renderContent('var(--monarch-text-muted)', 'var(--monarch-text-light)')}

        {/* Text layer 2: Bright text (clipped to progress width, visible on filled part) */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0 ${100 - clampedPercent}% 0 0)`,
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
          }}
        >
          {renderContent('rgba(255,255,255,1)', 'rgba(255,255,255,0.85)')}
        </div>
      </div>
    </div>
  );

  if (hasBreakdown) {
    return <Tooltip content={savedTooltipContent}>{progressBar}</Tooltip>;
  }

  return progressBar;
}
