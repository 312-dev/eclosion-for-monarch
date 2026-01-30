/**
 * EditStashProgress Component
 *
 * Progress display section for the Edit Stash Modal.
 * Shows savings progress bar and complete/uncomplete actions.
 */

import { useMemo } from 'react';
import { SavingsProgressBar } from '../shared';
import { Icons } from '../icons';
import { formatMonthsRemaining, calculateMonthsRemaining } from '../../utils/savingsCalculations';
import type { StashItem, ItemStatus } from '../../types';

interface EditStashProgressProps {
  readonly item: StashItem;
  readonly goalAmount: number;
  readonly monthlyTarget: number;
  readonly onComplete: (releaseFunds?: boolean) => Promise<void>;
  readonly onUncomplete: () => Promise<void>;
  readonly isCompletingItem: boolean;
  /** Change in starting balance (delta) for live preview updates */
  readonly startingBalanceDelta?: number;
  /** Current goal type from form state (for live preview) */
  readonly currentGoalType?: 'one_time' | 'savings_buffer' | 'debt';
  /** Current target date from form state (for live preview) */
  readonly targetDate?: string;
}

export function EditStashProgress({
  item,
  goalAmount,
  monthlyTarget,
  onComplete,
  onUncomplete,
  isCompletingItem,
  startingBalanceDelta = 0,
  currentGoalType,
  targetDate,
}: EditStashProgressProps) {
  // Use form's targetDate if provided, otherwise fall back to item's saved value
  const effectiveTargetDate = targetDate ?? item.target_date;
  const monthsRemaining = useMemo(
    () => calculateMonthsRemaining(effectiveTargetDate),
    [effectiveTargetDate]
  );

  // Adjust balance and rollover for starting balance changes (live preview)
  const adjustedBalance = item.current_balance + startingBalanceDelta;
  const progressPercent = goalAmount > 0 ? Math.min(100, (adjustedBalance / goalAmount) * 100) : 0;

  // Recalculate status based on adjusted balance
  const getAdjustedStatus = (): ItemStatus => {
    if (adjustedBalance >= goalAmount) return 'funded';
    if (adjustedBalance > 0) return item.status;
    return 'behind';
  };
  const displayStatus: ItemStatus = getAdjustedStatus();

  // Use actual rollover from Monarch, adjusted for delta
  const baseRollover =
    item.rollover_amount ?? Math.max(0, item.current_balance - item.planned_budget);
  const rolloverAmount = baseRollover + startingBalanceDelta;

  const creditsThisMonth = item.credits_this_month ?? 0;
  // Use form state if provided, otherwise fall back to item's saved value
  const goalType = currentGoalType ?? item.goal_type ?? 'one_time';

  // For one-time goals with spending, show available balance info
  const hasSpending =
    goalType === 'one_time' &&
    item.available_to_spend !== undefined &&
    item.available_to_spend !== item.current_balance;

  return (
    <>
      {/* Progress Bar Section */}
      <div>
        <SavingsProgressBar
          totalSaved={adjustedBalance}
          targetAmount={goalAmount}
          progressPercent={progressPercent}
          displayStatus={displayStatus}
          isEnabled={true}
          rolloverAmount={rolloverAmount}
          budgetedThisMonth={item.planned_budget}
          creditsThisMonth={creditsThisMonth}
          savedLabel="committed"
          goalType={goalType}
          {...(item.available_to_spend !== undefined && {
            availableToSpend: (item.available_to_spend ?? 0) + startingBalanceDelta,
          })}
        />

        {/* Available balance info for one-time goals with spending */}
        {hasSpending && (
          <div className="text-xs mt-2" style={{ color: 'var(--monarch-text-muted)' }}>
            ${item.available_to_spend?.toLocaleString()} available to spend
          </div>
        )}

        <div
          className="flex justify-between text-sm mt-3 pt-3 border-t"
          style={{ borderColor: 'var(--monarch-border)' }}
        >
          <div>
            <span style={{ color: 'var(--monarch-text-muted)' }}>Monthly: </span>
            <span style={{ color: 'var(--monarch-teal)', fontWeight: 500 }}>
              ${monthlyTarget}/mo
            </span>
          </div>
          <div style={{ color: 'var(--monarch-text-muted)' }}>
            {formatMonthsRemaining(monthsRemaining)} to go
          </div>
        </div>
      </div>

      {/* Mark as Done Button (one-time purchases only) */}
      {goalType === 'one_time' && !item.completed_at && (
        <div className="pt-3 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
          <button
            onClick={() => onComplete(false)}
            disabled={isCompletingItem}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-colors btn-press"
            style={{
              backgroundColor: 'var(--monarch-success-bg)',
              color: 'var(--monarch-success)',
              border: '1px solid var(--monarch-success)',
            }}
          >
            <Icons.Check size={18} />
            <span>Mark as Done</span>
          </button>
          <p className="text-xs text-center mt-1.5" style={{ color: 'var(--monarch-text-muted)' }}>
            Archives this goal as completed
          </p>
        </div>
      )}

      {/* Completed State (for already completed items) */}
      {item.completed_at && (
        <div className="pt-3 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
          <div
            className="p-3 rounded-lg flex items-center justify-between"
            style={{
              backgroundColor: 'var(--monarch-success-bg)',
              border: '1px solid var(--monarch-success)',
            }}
          >
            <div className="flex items-center gap-2" style={{ color: 'var(--monarch-success)' }}>
              <Icons.Check size={16} />
              <span className="font-medium">
                Completed{' '}
                {new Date(item.completed_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year:
                    new Date(item.completed_at).getFullYear() === new Date().getFullYear()
                      ? undefined
                      : 'numeric',
                })}
              </span>
            </div>
            <button
              onClick={onUncomplete}
              disabled={isCompletingItem}
              className="text-sm hover:underline"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </>
  );
}
