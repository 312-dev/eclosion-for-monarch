/**
 * WishlistBudgetInput - Editable budget input field for wishlist items
 *
 * Shows budget/monthly target inline (e.g., "$ 5 / 10") similar to RecurringItemBudget.
 * Allows users to manually allocate funds to their wishlist savings goals.
 */

import React, { useState } from 'react';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { Tooltip } from '../ui/Tooltip';

interface WishlistBudgetInputProps {
  readonly plannedBudget: number;
  readonly monthlyTarget: number;
  readonly onAllocate: (newAmount: number) => Promise<void>;
  readonly isAllocating: boolean;
}

export function WishlistBudgetInput({
  plannedBudget,
  monthlyTarget,
  onAllocate,
  isAllocating,
}: WishlistBudgetInputProps) {
  const [budgetInput, setBudgetInput] = useState(Math.round(plannedBudget).toString());
  const [prevPlannedBudget, setPrevPlannedBudget] = useState(plannedBudget);
  const isRateLimited = useIsRateLimited();

  const isDisabled = isAllocating || isRateLimited;

  // Adjust state during render when prop changes (React recommended pattern)
  if (plannedBudget !== prevPlannedBudget) {
    setPrevPlannedBudget(plannedBudget);
    setBudgetInput(Math.round(plannedBudget).toString());
  }

  const handleBudgetSubmit = async () => {
    // Treat empty input as $0
    const trimmedInput = budgetInput.trim();
    const parsedAmount = trimmedInput === '' ? 0 : Number.parseFloat(trimmedInput);
    if (Number.isNaN(parsedAmount)) {
      setBudgetInput(Math.round(plannedBudget).toString());
      return;
    }
    // Round to nearest dollar
    const newAmount = Math.round(parsedAmount);
    setBudgetInput(newAmount.toString());
    if (Math.abs(newAmount - plannedBudget) > 0.01) {
      await onAllocate(newAmount);
    }
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setBudgetInput(Math.round(plannedBudget).toString());
      (e.target as HTMLInputElement).blur();
    }
  };

  const target = Math.round(monthlyTarget);

  return (
    <div className="flex items-center whitespace-nowrap rounded bg-monarch-bg-card border border-monarch-border px-2 py-1 focus-within:border-monarch-orange">
      <span className="font-medium text-monarch-text-dark">$</span>
      <input
        type="number"
        value={budgetInput}
        onChange={(e) => setBudgetInput(e.target.value)}
        onKeyDown={handleBudgetKeyDown}
        onBlur={handleBudgetSubmit}
        onFocus={(e) => e.target.select()}
        disabled={isDisabled}
        aria-label="Budget amount"
        className="w-12 text-right font-medium text-monarch-text-dark bg-transparent font-inherit disabled:opacity-50 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <Tooltip
          content="Monthly savings target to reach your goal by the target date"
          side="bottom"
        >
          <span className="text-monarch-text-muted ml-1 cursor-help">/ {target}</span>
        </Tooltip>
    </div>
  );
}
