/**
 * SavingsProgressBar - Shared progress bar for savings goals
 *
 * Used by both Recurring items and Stash items to display
 * savings progress with consistent styling.
 */

import type { ItemStatus } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { formatCurrency, getStatusStyles } from '../../utils';
import {
  calculateSpendingMetrics,
  ProgressBarContent,
  renderBreakdownTooltip,
  TargetPin,
} from './SavingsProgressBarHelpers';

interface SavingsProgressBarProps {
  /** Current total saved amount */
  readonly totalSaved: number;
  /** Target amount to reach (null for open-ended goals) */
  readonly targetAmount: number | null;
  /** Progress percentage (0-100), null for open-ended goals */
  readonly progressPercent: number | null;
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
  // Early return for disabled items
  if (!isEnabled) {
    return null;
  }

  // Calculate spending metrics using helper
  const totalContributions = rolloverAmount + budgetedThisMonth + creditsThisMonth;
  const { displayedAvailable, spentThisMonth, hasSpendingToShow, savedForDisplay } =
    calculateSpendingMetrics(goalType, totalSaved, totalContributions, availableToSpend);

  // Show tooltip breakdown when there's data to show
  const hasContributionBreakdown =
    rolloverAmount > 0 || creditsThisMonth > 0 || budgetedThisMonth > 0;
  const hasBreakdown =
    hasContributionBreakdown || (savedLabel === 'committed' && hasSpendingToShow);

  // For open-ended goals (null progress), show minimal progress to indicate activity
  const isOpenEnded = targetAmount === null || progressPercent === null;
  const clampedPercent = isOpenEnded ? 0 : Math.min(progressPercent, 100);

  // Use rewarding green for positive statuses, status colors for warnings/errors
  const status = displayStatus ?? 'on_track';
  const isPositiveStatus = status === 'funded' || status === 'on_track' || status === 'ahead';
  const fillColor =
    progressColor ??
    (isPositiveStatus ? 'var(--progress-bar-success)' : getStatusStyles(status, isEnabled).color);

  // Format amounts for display
  const savedAmount = formatCurrency(savedForDisplay, { maximumFractionDigits: 0 });
  const toGoAmount =
    targetAmount === null
      ? null
      : formatCurrency(Math.max(0, targetAmount - savedForDisplay), {
          maximumFractionDigits: 0,
        });
  const availableAmount =
    displayedAvailable === undefined
      ? ''
      : formatCurrency(displayedAvailable, { maximumFractionDigits: 0 });

  // Shared props for content rendering
  const contentProps = {
    hasSpendingToShow,
    availableAmount,
    savedAmount,
    savedLabel,
    toGoAmount,
  };

  // Tooltip content for saved breakdown
  // Uses "committed" terminology for stash items, "saved" for others
  const totalLabel = savedLabel === 'committed' ? 'Total Committed' : 'Total Saved';
  const savedTooltipContent = hasBreakdown
    ? renderBreakdownTooltip({
        rolloverAmount,
        creditsThisMonth,
        budgetedThisMonth,
        savedAmount,
        totalLabel,
        hasContributionBreakdown,
        hasSpendingToShow,
        spentThisMonth,
        availableAmount,
      })
    : null;

  // Check if we should show the target indicator
  const showTargetIndicator =
    expectedProgressPercent != null && expectedProgressPercent > 0 && expectedProgressPercent < 100;

  // Calculate target amount for this month
  const expectedTargetAmount =
    showTargetIndicator && targetAmount !== null
      ? Math.round(targetAmount * (expectedProgressPercent / 100))
      : null;

  // Target pin component - rendered separately from the bar tooltip
  const targetPin = showTargetIndicator ? (
    <TargetPin
      expectedProgressPercent={expectedProgressPercent}
      expectedTargetAmount={expectedTargetAmount}
      clampedPercent={clampedPercent}
      fillColor={fillColor}
    />
  ) : null;

  // The progress bar without the pin (pin is rendered as sibling)
  const progressBarInner = (
    <div className="relative w-full h-8 rounded-lg overflow-visible cursor-default">
      {/* Progress bar container */}
      <div
        className="absolute inset-0 rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--progress-bar-track)',
        }}
      >
        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 transition-all"
          style={{
            width: `${clampedPercent}%`,
            backgroundColor: fillColor,
          }}
        />

        {/* Expected progress tick mark */}
        {showTargetIndicator && (
          <div
            className="absolute inset-y-0 pointer-events-none z-10"
            style={{
              left: `${expectedProgressPercent}%`,
              width: '1px',
              backgroundColor:
                clampedPercent >= expectedProgressPercent
                  ? 'rgba(255, 255, 255, 0.55)'
                  : 'rgba(0, 0, 0, 0.25)',
            }}
          />
        )}

        {/* Text layer 1: Muted text (visible on unfilled/background part) */}
        <ProgressBarContent
          {...contentProps}
          textColor="var(--monarch-text-muted)"
          labelColor="var(--monarch-text-light)"
        />

        {/* Text layer 2: Bright text (clipped to progress width, visible on filled part) */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0 ${100 - clampedPercent}% 0 0)`,
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
          }}
        >
          <ProgressBarContent
            {...contentProps}
            textColor="rgba(255,255,255,1)"
            labelColor="rgba(255,255,255,0.85)"
          />
        </div>
      </div>
    </div>
  );

  // Wrap in outer container with pin as sibling (not nested in tooltip)
  if (hasBreakdown) {
    return (
      <div className="relative w-full">
        {targetPin}
        <Tooltip content={savedTooltipContent} triggerClassName="w-full">
          {progressBarInner}
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {targetPin}
      {progressBarInner}
    </div>
  );
}
