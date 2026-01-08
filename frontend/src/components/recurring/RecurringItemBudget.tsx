/**
 * RecurringItemBudget - Editable budget input field with target display
 *
 * Shows budget/monthly target inline (e.g., "$ 5 / 10") and interval below for non-monthly.
 * The frozen_monthly_target is fixed for the month and doesn't change when budgeting.
 */

import React, { useState } from 'react';
import type { RecurringItem } from '../../types';
import { formatCurrency, formatFrequencyShort } from '../../utils';

interface RecurringItemBudgetProps {
  readonly item: RecurringItem;
  readonly onAllocate: (amount: number) => Promise<void>;
  readonly isAllocating: boolean;
}

export function RecurringItemBudget({
  item,
  onAllocate,
  isAllocating,
}: RecurringItemBudgetProps) {
  const [budgetInput, setBudgetInput] = useState(Math.round(item.planned_budget).toString());
  const [prevPlannedBudget, setPrevPlannedBudget] = useState(item.planned_budget);

  // Adjust state during render when prop changes (React recommended pattern)
  if (item.planned_budget !== prevPlannedBudget) {
    setPrevPlannedBudget(item.planned_budget);
    setBudgetInput(Math.round(item.planned_budget).toString());
  }

  const handleBudgetSubmit = async () => {
    // Treat empty input as $0
    const trimmedInput = budgetInput.trim();
    const parsedAmount = trimmedInput === '' ? 0 : Number.parseFloat(trimmedInput);
    if (Number.isNaN(parsedAmount)) {
      setBudgetInput(Math.round(item.planned_budget).toString());
      return;
    }
    // Round to nearest dollar (towards zero for negatives)
    const newAmount = Math.round(parsedAmount);
    setBudgetInput(newAmount.toString());
    const diff = newAmount - item.planned_budget;
    if (Math.abs(diff) > 0.01) {
      await onAllocate(diff);
    }
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setBudgetInput(Math.round(item.planned_budget).toString());
      (e.target as HTMLInputElement).blur();
    }
  };

  const target = Math.round(item.frozen_monthly_target);
  const showInterval = item.frequency !== 'monthly';

  if (!item.is_enabled) {
    return (
      <div className="flex flex-col items-end">
        <div className="flex items-center whitespace-nowrap rounded bg-monarch-bg-card border border-monarch-border px-2 py-1 opacity-50">
          <span className="font-medium text-monarch-text-muted">$</span>
          <input
            type="number"
            value={0}
            disabled
            readOnly
            className="w-16 text-right font-medium text-monarch-text-muted bg-transparent font-inherit cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-monarch-text-muted ml-1">/ {target}</span>
        </div>
        {showInterval && (
          <div className="text-xs text-monarch-text-muted text-right mt-0.5">
            {formatCurrency(item.amount, { maximumFractionDigits: 0 })}{formatFrequencyShort(item.frequency)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center whitespace-nowrap rounded bg-monarch-bg-card border border-monarch-border px-2 py-1 focus-within:border-monarch-orange">
        <span className="font-medium text-monarch-text-dark">$</span>
        <input
          type="number"
          value={budgetInput}
          onChange={(e) => setBudgetInput(e.target.value)}
          onKeyDown={handleBudgetKeyDown}
          onBlur={handleBudgetSubmit}
          onFocus={(e) => e.target.select()}
          disabled={isAllocating}
          className="w-16 text-right font-medium text-monarch-text-dark bg-transparent font-inherit disabled:opacity-50 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-monarch-text-muted ml-1">/ {target}</span>
      </div>
      {showInterval && (
        <div className="text-xs text-monarch-text-light text-right mt-0.5">
          {formatCurrency(item.amount, { maximumFractionDigits: 0 })}{formatFrequencyShort(item.frequency)}
        </div>
      )}
    </div>
  );
}
