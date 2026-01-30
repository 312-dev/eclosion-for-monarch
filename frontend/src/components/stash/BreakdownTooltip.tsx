/**
 * BreakdownTooltip
 *
 * Tooltip content showing the Available Funds calculation breakdown.
 */

import { useMemo } from 'react';
import { BreakdownRow } from './BreakdownRow';
import type { AvailableToStashBreakdown, DetailedBreakdown } from '../../types';

interface BreakdownTooltipProps {
  readonly breakdown: AvailableToStashBreakdown;
  readonly detailedBreakdown: DetailedBreakdown;
  readonly includeExpectedIncome: boolean;
  readonly statusColor: string;
  readonly formattedAmount: string;
  readonly onExpand: () => void;
}

export function BreakdownTooltip({
  breakdown,
  detailedBreakdown,
  includeExpectedIncome,
  statusColor,
  formattedAmount,
  onExpand,
}: BreakdownTooltipProps) {
  // Calculate running totals for each line item
  const runningTotals = useMemo(() => {
    const expectedIncome = includeExpectedIncome ? breakdown.expectedIncome : 0;
    return {
      afterExpectedIncome: expectedIncome,
      afterCash: expectedIncome + breakdown.cashOnHand,
      afterGoals: expectedIncome + breakdown.cashOnHand - breakdown.goalBalances,
      afterCC:
        expectedIncome + breakdown.cashOnHand - breakdown.goalBalances - breakdown.creditCardDebt,
      afterUnspent:
        expectedIncome +
        breakdown.cashOnHand -
        breakdown.goalBalances -
        breakdown.creditCardDebt -
        breakdown.unspentBudgets,
      afterStash:
        expectedIncome +
        breakdown.cashOnHand -
        breakdown.goalBalances -
        breakdown.creditCardDebt -
        breakdown.unspentBudgets -
        breakdown.stashBalances,
      afterBuffer:
        expectedIncome +
        breakdown.cashOnHand -
        breakdown.goalBalances -
        breakdown.creditCardDebt -
        breakdown.unspentBudgets -
        breakdown.stashBalances -
        breakdown.bufferAmount,
    };
  }, [breakdown, includeExpectedIncome]);

  return (
    <div className="text-sm space-y-2 min-w-72">
      <div className="space-y-1">
        {includeExpectedIncome && breakdown.expectedIncome > 0 && (
          <BreakdownRow
            label="Expected income"
            amount={breakdown.expectedIncome}
            isPositive
            runningTotal={runningTotals.afterExpectedIncome}
          />
        )}
        <BreakdownRow
          label="Cash on hand"
          amount={breakdown.cashOnHand}
          isPositive
          items={detailedBreakdown.cashAccounts}
          onExpand={onExpand}
          runningTotal={runningTotals.afterCash}
        />
        <BreakdownRow
          label="Remaining goal funds"
          amount={breakdown.goalBalances}
          items={detailedBreakdown.goals}
          onExpand={onExpand}
          runningTotal={runningTotals.afterGoals}
        />
        <BreakdownRow
          label="Credit card debt"
          amount={breakdown.creditCardDebt}
          items={detailedBreakdown.creditCards}
          onExpand={onExpand}
          runningTotal={runningTotals.afterCC}
        />
        <BreakdownRow
          label="Unspent budgets"
          amount={breakdown.unspentBudgets}
          items={detailedBreakdown.unspentCategories}
          onExpand={onExpand}
          runningTotal={runningTotals.afterUnspent}
        />
        <BreakdownRow
          label="Stash balances"
          amount={breakdown.stashBalances}
          items={detailedBreakdown.stashItems}
          onExpand={onExpand}
          runningTotal={runningTotals.afterStash}
        />
        {breakdown.bufferAmount > 0 && (
          <BreakdownRow
            label="Reserved buffer"
            amount={breakdown.bufferAmount}
            runningTotal={runningTotals.afterBuffer}
          />
        )}
      </div>
      <div
        className="flex justify-between font-medium pt-2 border-t"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        <span>Available</span>
        <span style={{ color: statusColor }}>{formattedAmount}</span>
      </div>
    </div>
  );
}
