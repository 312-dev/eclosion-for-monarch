/**
 * StashBudgetInput - Editable budget input field for stash items
 *
 * Shows budget/monthly target inline (e.g., "$ 5 / 10") similar to RecurringItemBudget.
 * Allows users to manually allocate funds to their stash savings goals.
 */

import React, { useState, useCallback } from 'react';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useAvailableToStashDrawerOptional } from '../../context';
import { useDistributionMode } from '../../context/DistributionModeContext';
import { Tooltip } from '../ui/Tooltip';
import { createArrowKeyHandler } from '../../hooks/useArrowKeyIncrement';

/**
 * Format a number with commas for display. Returns empty string for 0.
 */
function formatWithCommas(value: number): string {
  if (value === 0) return '';
  return Math.round(value).toLocaleString('en-US');
}

/**
 * Parse a formatted string (with commas) back to a number.
 */
function parseFormatted(value: string): number {
  const digitsOnly = value.replaceAll(/\D/g, '');
  if (digitsOnly === '') return 0;
  return Number.parseInt(digitsOnly, 10);
}

interface StashBudgetInputProps {
  readonly itemId: string;
  readonly plannedBudget: number;
  readonly monthlyTarget: number;
  readonly onAllocate: (newAmount: number) => Promise<void>;
  readonly isAllocating: boolean;
  /** Whether the Take overlay is currently active */
  readonly isTakeModeActive?: boolean;
  /** Whether the Take amount would dip into the budgeted amount */
  readonly isDippingIntoBudget?: boolean;
  /** Additional budget being added from Left to Budget via Stash mode */
  readonly additionalBudgetFromStash?: number;
  /** Whether the Stash amount exceeds the combined available limit */
  readonly isStashOverLimit?: boolean;
  /** Whether the withdraw/deposit overlay is visible on the card */
  readonly isOverlayVisible?: boolean;
  /** Optional data-tour attribute for guided tour targeting */
  readonly dataTour?: string | undefined;
}

export function StashBudgetInput({
  itemId,
  plannedBudget,
  monthlyTarget,
  onAllocate,
  isAllocating,
  isTakeModeActive = false,
  isDippingIntoBudget = false,
  additionalBudgetFromStash = 0,
  isStashOverLimit = false,
  isOverlayVisible = false,
  dataTour,
}: StashBudgetInputProps) {
  const [budgetInput, setBudgetInput] = useState(formatWithCommas(plannedBudget));
  const [prevPlannedBudget, setPrevPlannedBudget] = useState(plannedBudget);
  const isRateLimited = useIsRateLimited();
  const { mode: distributionMode, setMonthlyAllocation } = useDistributionMode();

  // Optional drawer context - may not be available in all contexts
  const drawerContext = useAvailableToStashDrawerOptional();

  const { requestSubmit } = useDistributionMode();
  const isAddingFromLeftToBudget = additionalBudgetFromStash > 0;
  const isDisabled =
    isAllocating ||
    isRateLimited ||
    isTakeModeActive ||
    isAddingFromLeftToBudget ||
    isOverlayVisible;
  const isHypothesizeMode = distributionMode === 'hypothesize';
  const isDistributeMode = distributionMode === 'distribute';
  const isInDistributionMode = isHypothesizeMode || isDistributeMode;

  // Calculate projected budget when adding from Left to Budget
  const projectedBudget = plannedBudget + additionalBudgetFromStash;

  // Adjust state during render when prop changes (React recommended pattern)
  if (plannedBudget !== prevPlannedBudget) {
    setPrevPlannedBudget(plannedBudget);
    setBudgetInput(formatWithCommas(plannedBudget));
  }

  const handleBudgetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;
      const digitsOnly = rawInput.replaceAll(/\D/g, '');
      if (digitsOnly === '') {
        setBudgetInput('');
        // In hypothesize mode, update monthly allocation immediately (draws from Left to Budget)
        if (isHypothesizeMode) {
          setMonthlyAllocation(itemId, 0);
        }
      } else {
        const numericValue = Number.parseInt(digitsOnly, 10);
        setBudgetInput(numericValue.toLocaleString('en-US'));
        // In hypothesize mode, update monthly allocation immediately
        if (isHypothesizeMode) {
          setMonthlyAllocation(itemId, numericValue);
        }
      }
    },
    [isHypothesizeMode, itemId, setMonthlyAllocation]
  );

  const handleBudgetSubmit = async () => {
    // Parse the formatted input
    const parsedAmount = parseFormatted(budgetInput);
    // Update display to normalized format
    setBudgetInput(formatWithCommas(parsedAmount));

    if (Math.abs(parsedAmount - plannedBudget) > 0.01) {
      if (isHypothesizeMode) {
        // In hypothesize mode, only update local state - never sync to Monarch
        setMonthlyAllocation(itemId, parsedAmount);
      } else {
        // Normal mode: sync to Monarch
        await onAllocate(parsedAmount);
      }
    }
    drawerContext?.closeTemporary();
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle arrow key increment/decrement
    const currentValue = parseFormatted(budgetInput);
    const arrowHandler = createArrowKeyHandler({
      value: currentValue,
      onChange: (newValue) => {
        setBudgetInput(formatWithCommas(newValue));
        if (isHypothesizeMode) {
          setMonthlyAllocation(itemId, newValue);
        }
      },
      step: 1,
      min: 0,
      disabled: isDisabled,
    });
    arrowHandler(e);

    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
      // In distribution modes, trigger apply/save
      if (isInDistributionMode) {
        requestSubmit();
      }
    } else if (e.key === 'Escape') {
      setBudgetInput(formatWithCommas(plannedBudget));
      drawerContext?.closeTemporary();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    drawerContext?.temporarilyOpen();
    e.target.select();
  };

  const target = Math.round(monthlyTarget);
  const targetFormatted = target.toLocaleString('en-US');

  // Display value: show projected budget when adding from Left to Budget
  const displayValue = isAddingFromLeftToBudget ? formatWithCommas(projectedBudget) : budgetInput;

  // Calculate width: digits need ~1ch, commas need ~0.3ch
  const digitCount = displayValue.replaceAll(/\D/g, '').length || 1; // At least 1 for placeholder
  const commaCount = (displayValue.match(/,/g) || []).length;
  // Min 1ch, max 8ch (covers up to 999,999 which is $1M)
  const inputWidth = Math.min(8, Math.max(1, digitCount + commaCount * 0.3));

  // Determine border and background styles based on mode
  const getModeStyles = () => {
    // Stash amount exceeds combined available - error highlight
    if (isStashOverLimit) {
      return {
        className: '',
        style: {
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          borderColor: 'var(--monarch-error)',
        },
      };
    }
    // Stash mode drawing from Left to Budget - green highlight
    if (isAddingFromLeftToBudget) {
      return {
        className: '',
        style: {
          backgroundColor: 'var(--overlay-btn-bg-active-stash)',
          borderColor: 'var(--monarch-success)',
        },
      };
    }
    // Take mode dipping into budget - orange highlight
    if (isDippingIntoBudget) {
      return {
        className: '',
        style: {
          backgroundColor: 'var(--overlay-btn-bg-active-take)',
          borderColor: 'var(--monarch-warning)',
        },
      };
    }
    if (isHypothesizeMode) {
      return {
        className: '',
        style: {
          backgroundColor: 'var(--hypothesize-input-bg)',
          borderColor: 'var(--hypothesize-input-border)',
        },
      };
    }
    if (isDistributeMode) {
      return {
        className: '',
        style: {
          backgroundColor: 'var(--distribute-input-bg)',
          borderColor: 'var(--distribute-input-border)',
        },
      };
    }
    return {
      className: 'bg-monarch-bg-card border-monarch-border',
      style: undefined,
    };
  };

  const modeStyles = getModeStyles();

  return (
    <label
      data-tour={dataTour}
      className={`inline-flex items-center rounded border px-2 py-1 focus-within:border-monarch-orange ${modeStyles.className} ${isDisabled ? 'cursor-not-allowed' : 'cursor-text'}`}
      style={modeStyles.style}
      data-no-dnd="true"
    >
      <span className="font-medium text-monarch-text-dark mr-1">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleBudgetChange}
        onKeyDown={handleBudgetKeyDown}
        onBlur={handleBudgetSubmit}
        onFocus={handleFocus}
        disabled={isDisabled}
        placeholder="0"
        aria-label="Budget amount"
        className="text-right font-medium text-monarch-text-dark bg-transparent font-inherit disabled:opacity-50 disabled:cursor-not-allowed outline-none tabular-nums"
        style={{ width: `${inputWidth}ch` }}
      />
      <Tooltip content="Monthly savings target to reach your goal by the target date" side="bottom">
        <span className="text-monarch-text-muted ml-1 tabular-nums">/ {targetFormatted}</span>
      </Tooltip>
    </label>
  );
}
