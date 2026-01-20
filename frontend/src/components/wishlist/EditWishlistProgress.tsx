/**
 * EditWishlistProgress Component
 *
 * Progress display section for the Edit Wishlist Modal.
 */

import { SavingsProgressBar } from '../shared';
import { formatMonthsRemaining } from '../../utils/savingsCalculations';
import type { WishlistItem, ItemStatus } from '../../types';

interface EditWishlistProgressProps {
  readonly item: WishlistItem;
  readonly goalAmount: number;
  readonly monthlyTarget: number;
  readonly monthsRemaining: number;
}

export function EditWishlistProgress({
  item,
  goalAmount,
  monthlyTarget,
  monthsRemaining,
}: EditWishlistProgressProps) {
  const progressPercent =
    goalAmount > 0 ? Math.min(100, (item.current_balance / goalAmount) * 100) : 0;
  const displayStatus: ItemStatus = item.status;
  const rolloverAmount = Math.max(0, item.current_balance - item.planned_budget);

  return (
    <div
      className="p-4 rounded-lg"
      style={{
        backgroundColor: 'var(--monarch-bg-page)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      <SavingsProgressBar
        totalSaved={item.current_balance}
        targetAmount={goalAmount}
        progressPercent={progressPercent}
        displayStatus={displayStatus}
        isEnabled={true}
        rolloverAmount={rolloverAmount}
        budgetedThisMonth={item.planned_budget}
      />
      <div
        className="flex justify-between text-sm mt-3 pt-3 border-t"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        <div>
          <span style={{ color: 'var(--monarch-text-muted)' }}>Monthly: </span>
          <span style={{ color: 'var(--monarch-teal)', fontWeight: 500 }}>${monthlyTarget}/mo</span>
        </div>
        <div style={{ color: 'var(--monarch-text-muted)' }}>
          {formatMonthsRemaining(monthsRemaining)} to go
        </div>
      </div>
    </div>
  );
}
