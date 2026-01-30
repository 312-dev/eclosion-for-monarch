/**
 * MonarchGoalProgressBar - Progress bar for Monarch savings goals
 *
 * Wraps SavingsProgressBar with Monarch goal-specific color mapping.
 */

import { memo } from 'react';
import type { MonarchGoal } from '../../types/monarchGoal';
import { SavingsProgressBar } from '../shared/SavingsProgressBar';

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

/** Status colors for progress bar - uses CSS variables for theme support */
const STATUS_COLORS = {
  ahead: 'var(--progress-bar-success)', // Rewarding green
  on_track: 'var(--monarch-info)', // Blue
  at_risk: 'var(--monarch-warning)', // Yellow
  completed: 'var(--progress-bar-success)', // Rewarding green
  no_target: 'var(--progress-bar-success)', // Rewarding green - "save as you go" goals are always fully funded
} as const;

export const MonarchGoalProgressBar = memo(function MonarchGoalProgressBar({
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

  // Calculate spending (difference between contributions and current balance)
  const spentAmount = Math.max(0, netContribution - currentBalance);
  const hasSpending = spentAmount > 0;

  // When no target, use netContribution as target so "to go" shows $0
  const displayTarget = hasTarget ? targetAmount : netContribution;

  return (
    <SavingsProgressBar
      totalSaved={netContribution}
      targetAmount={displayTarget}
      progressPercent={actualProgress}
      progressColor={progressColor}
      savedLabel="saved"
      // When there's spending, show available breakdown
      {...(hasSpending && {
        availableToSpend: currentBalance,
        budgetedThisMonth: netContribution,
      })}
    />
  );
});
