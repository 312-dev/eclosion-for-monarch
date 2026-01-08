/**
 * RecurringItemStatus - Status badge with allocation actions
 *
 * Displays status badge with optional allocate confirmation buttons
 * when item is critical and needs funding.
 */

import { useState } from 'react';
import type { RecurringItem, ItemStatus } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { getStatusLabel, getStatusStyles, formatCurrency } from '../../utils';

/**
 * Generate a plain English explanation of how the status was determined.
 * Numbers are wrapped in <strong> tags for emphasis.
 */
function getStatusExplanation(item: RecurringItem, _displayStatus: ItemStatus): React.ReactNode {
  const budget = Math.ceil(item.planned_budget);
  const target = Math.ceil(item.frozen_monthly_target);
  // Total saved = current_balance (rollover) + contributed_this_month
  const balance = Math.round(item.current_balance + item.contributed_this_month);
  const amount = Math.round(item.amount);
  const isFunded = balance >= amount;
  const isMonthly = item.frequency_months <= 1;

  const fmt = (n: number) => formatCurrency(n, { maximumFractionDigits: 0 });
  const bold = (text: string) => <strong key={text}>{text}</strong>;

  if (!item.is_enabled) {
    return 'This item is paused.';
  }

  if (item.frozen_monthly_target <= 0) {
    if (isFunded) {
      return <>You have {bold(fmt(balance))} saved, which covers the {bold(fmt(amount))} expense.</>;
    }
    return 'No monthly target has been set.';
  }

  // Monthly expenses: still need to budget even when funded (next month's bill is coming)
  if (isMonthly && isFunded) {
    if (budget > target) {
      return (
        <>
          You have {bold(fmt(balance))} saved for this month&apos;s {bold(fmt(amount))} bill.
          Budgeting {bold(fmt(budget))}/mo is more than the {bold(fmt(target))}/mo needed.
        </>
      );
    }
    if (budget >= target) {
      return (
        <>
          You have {bold(fmt(balance))} saved for this month&apos;s {bold(fmt(amount))} bill.
          Budgeting {bold(fmt(budget))}/mo keeps you on track for next month.
        </>
      );
    }
    return (
      <>
        You have {bold(fmt(balance))} saved for this month&apos;s {bold(fmt(amount))} bill.
        Budgeting {bold(fmt(budget))}/mo is less than the {bold(fmt(target))}/mo needed for next month.
      </>
    );
  }

  // Infrequent expenses: when funded, you can stop budgeting
  if (isFunded) {
    if (budget > 0) {
      return (
        <>
          You&apos;ve saved {bold(fmt(balance))}, fully covering the {bold(fmt(amount))} expense.
          You&apos;re still budgeting {bold(fmt(budget))}/mo when you could budget {bold('$0')}.
        </>
      );
    }
    return (
      <>
        You&apos;ve saved {bold(fmt(balance))}, fully covering the {bold(fmt(amount))} expense.
        No more saving needed until it resets!
      </>
    );
  }

  // Not funded
  if (budget > target) {
    return (
      <>
        Budgeting {bold(fmt(budget))}/mo, which is more than the {bold(fmt(target))}/mo target.
      </>
    );
  }

  if (budget >= target) {
    return (
      <>
        Budgeting {bold(fmt(budget))}/mo, which meets the {bold(fmt(target))}/mo target.
      </>
    );
  }

  // Budget below target
  return (
    <>
      Budgeting {bold(fmt(budget))}/mo, which is less than the {bold(fmt(target))}/mo needed.
    </>
  );
}

interface RecurringItemStatusProps {
  readonly item: RecurringItem;
  readonly displayStatus: ItemStatus;
  readonly onAllocate: () => Promise<void>;
  readonly isAllocating: boolean;
}

export function RecurringItemStatus({
  item,
  displayStatus,
  onAllocate,
  isAllocating,
}: RecurringItemStatusProps) {
  const [showAllocateConfirm, setShowAllocateConfirm] = useState(false);

  const isCritical = item.is_enabled && item.status === 'critical' && item.amount_needed_now > 0;

  const handleAllocate = async () => {
    await onAllocate();
    setShowAllocateConfirm(false);
  };

  if (isCritical && !showAllocateConfirm) {
    return (
      <Tooltip content="Click to allocate funds">
        <button
          onClick={() => setShowAllocateConfirm(true)}
          className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer whitespace-nowrap bg-monarch-error-bg text-monarch-error"
        >
          Off Track
        </button>
      </Tooltip>
    );
  }

  if (isCritical && showAllocateConfirm) {
    return (
      <div className="flex items-center gap-1 justify-center">
        <button
          onClick={handleAllocate}
          disabled={isAllocating}
          className="px-2 py-1 text-xs font-medium rounded text-white disabled:opacity-50 transition-colors bg-monarch-success"
        >
          {isAllocating ? '...' : 'Allocate'}
        </button>
        <button
          onClick={() => setShowAllocateConfirm(false)}
          className="px-2 py-1 text-xs font-medium rounded transition-colors bg-monarch-bg-page text-monarch-text-dark"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <Tooltip content={getStatusExplanation(item, displayStatus)}>
      <span
        className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full cursor-help whitespace-nowrap"
        style={{
          backgroundColor: getStatusStyles(displayStatus, item.is_enabled).bg,
          color: getStatusStyles(displayStatus, item.is_enabled).color,
        }}
      >
        {getStatusLabel(displayStatus, item.is_enabled)}
      </span>
    </Tooltip>
  );
}
