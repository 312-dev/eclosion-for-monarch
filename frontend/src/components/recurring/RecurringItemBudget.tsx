/**
 * RecurringItemBudget - Editable budget input field
 *
 * Displays budget amount with inline editing when enabled,
 * or read-only display when disabled.
 */

import React, { useState } from 'react';
import type { RecurringItem } from '../../types';
import { formatCurrency } from '../../utils';

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
  const [budgetInput, setBudgetInput] = useState(Math.ceil(item.planned_budget).toString());
  const [prevPlannedBudget, setPrevPlannedBudget] = useState(item.planned_budget);

  // Adjust state during render when prop changes (React recommended pattern)
  if (item.planned_budget !== prevPlannedBudget) {
    setPrevPlannedBudget(item.planned_budget);
    setBudgetInput(Math.ceil(item.planned_budget).toString());
  }

  const handleBudgetSubmit = async () => {
    const parsedAmount = Number.parseFloat(budgetInput);
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setBudgetInput(Math.ceil(item.planned_budget).toString());
      return;
    }
    // Round up to nearest dollar
    const newAmount = Math.ceil(parsedAmount);
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
      setBudgetInput(Math.ceil(item.planned_budget).toString());
      (e.target as HTMLInputElement).blur();
    }
  };

  if (!item.is_enabled) {
    return (
      <span className="font-medium text-monarch-text-muted">
        {formatCurrency(item.planned_budget, { maximumFractionDigits: 0 })}
      </span>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 font-medium text-monarch-text-dark">
          $
        </span>
        <input
          type="number"
          value={budgetInput}
          onChange={(e) => setBudgetInput(e.target.value)}
          onKeyDown={handleBudgetKeyDown}
          onBlur={handleBudgetSubmit}
          onFocus={(e) => e.target.select()}
          disabled={isAllocating}
          className="w-24 pl-6 pr-2 py-1 text-right rounded font-medium text-monarch-text-dark bg-monarch-bg-card border border-monarch-border font-inherit disabled:opacity-50"
        />
      </div>
    </div>
  );
}
