/**
 * RecurringItemProgress - Progress bar with saved/target display
 *
 * Shows progress bar with saved amount on left and target amount on right.
 */

import type { RecurringItem, ItemStatus } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { formatCurrency, getStatusStyles } from '../../utils';

interface RecurringItemProgressProps {
  readonly item: RecurringItem;
  readonly displayStatus: ItemStatus;
  readonly progressPercent: number;
}

export function RecurringItemProgress({
  item,
  displayStatus,
  progressPercent,
}: RecurringItemProgressProps) {
  // current_balance = current total balance (includes rollover + contributions this month)
  // contributed_this_month = what's been added to balance this month
  // rollover = current_balance - contributed_this_month (what was there at start of month)
  // Note: rollover + contributed_this_month = current_balance (total saved)
  const totalSaved = item.current_balance;
  const rolloverAmount = Math.max(0, item.current_balance - item.contributed_this_month);
  const budgetedThisMonth = item.contributed_this_month;
  const hasRollover = rolloverAmount > 0;

  if (!item.is_enabled) {
    return null;
  }

  return (
    <div>
      <div className="w-full rounded-full h-1.5 bg-neutral-600">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${progressPercent}%`, backgroundColor: getStatusStyles(displayStatus, item.is_enabled).color }}
        />
      </div>
      <div className="text-xs mt-0.5 flex justify-between">
        {hasRollover ? (
          <Tooltip content={
            <>
              <div>{formatCurrency(rolloverAmount, { maximumFractionDigits: 0 })} rolled over</div>
              <div>{formatCurrency(budgetedThisMonth, { maximumFractionDigits: 0 })} budgeted this month</div>
            </>
          }>
            <span className="text-monarch-text-dark cursor-help underline decoration-dotted underline-offset-2">
              {formatCurrency(totalSaved, { maximumFractionDigits: 0 })} saved
            </span>
          </Tooltip>
        ) : (
          <span className="text-monarch-text-dark">
            {formatCurrency(totalSaved, { maximumFractionDigits: 0 })} saved
          </span>
        )}
        <span className="text-monarch-text-light">
          {formatCurrency(item.progress_target ?? item.amount, { maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );
}
