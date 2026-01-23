/**
 * RecurringItemBudget - Editable budget input field with target display
 *
 * Shows budget/monthly target inline (e.g., "$ 5 / 10") and interval below for non-monthly.
 * The frozen_monthly_target is fixed for the month and doesn't change when budgeting.
 */

import React, { useState, useCallback } from 'react';
import type { RecurringItem } from '../../types';
import { formatCurrency, formatFrequencyShort, getNormalizationDate } from '../../utils';
import { TrendUpIcon, TrendDownIcon, AnchorIcon } from '../icons';
import { Tooltip } from '../ui/Tooltip';
import { useIsRateLimited } from '../../context/RateLimitContext';

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

interface RecurringItemBudgetProps {
  readonly item: RecurringItem;
  readonly onAllocate: (diff: number, newAmount: number) => Promise<void>;
  readonly isAllocating: boolean;
}

export function RecurringItemBudget({ item, onAllocate, isAllocating }: RecurringItemBudgetProps) {
  const [budgetInput, setBudgetInput] = useState(formatWithCommas(item.planned_budget));
  const [prevPlannedBudget, setPrevPlannedBudget] = useState(item.planned_budget);
  const isRateLimited = useIsRateLimited();

  // Disable input when allocating or rate limited
  const isDisabled = isAllocating || isRateLimited;

  // Adjust state during render when prop changes (React recommended pattern)
  if (item.planned_budget !== prevPlannedBudget) {
    setPrevPlannedBudget(item.planned_budget);
    setBudgetInput(formatWithCommas(item.planned_budget));
  }

  const handleBudgetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const digitsOnly = rawInput.replaceAll(/\D/g, '');
    if (digitsOnly === '') {
      setBudgetInput('');
    } else {
      const numericValue = Number.parseInt(digitsOnly, 10);
      setBudgetInput(numericValue.toLocaleString('en-US'));
    }
  }, []);

  const handleBudgetSubmit = async () => {
    // Parse the formatted input
    const parsedAmount = parseFormatted(budgetInput);
    // Update display to normalized format
    setBudgetInput(formatWithCommas(parsedAmount));
    const diff = parsedAmount - item.planned_budget;
    if (Math.abs(diff) > 0.01) {
      await onAllocate(diff, parsedAmount);
    }
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setBudgetInput(formatWithCommas(item.planned_budget));
      (e.target as HTMLInputElement).blur();
    }
  };

  const target = Math.round(item.frozen_monthly_target);
  const idealRate = Math.round(item.ideal_monthly_rate);
  const showInterval = item.frequency !== 'monthly';

  // Rate adjustment indicators: catching up (higher than stable), ahead (lower than stable), or stable
  const isCatchingUp = target > idealRate && idealRate > 0;
  const isAhead = target < idealRate && target > 0;
  const isStable = target === idealRate && target > 0;

  if (!item.is_enabled) {
    return (
      <div className="flex flex-col items-end">
        <div className="flex items-center whitespace-nowrap rounded bg-monarch-bg-card border border-monarch-border px-2 py-1 opacity-50">
          <span className="font-medium text-monarch-text-muted">$</span>
          <input
            type="text"
            inputMode="numeric"
            value="0"
            disabled
            readOnly
            className="w-16 text-right font-medium text-monarch-text-muted bg-transparent font-inherit cursor-not-allowed tabular-nums"
          />
          <span className="text-monarch-text-muted ml-1">/ {target}</span>
          {isCatchingUp && (
            <Tooltip
              content={
                <>
                  <div className="font-medium flex items-center gap-1">
                    <TrendUpIcon size={12} strokeWidth={2.5} className="text-monarch-error" />{' '}
                    Catching Up
                  </div>
                  <div>
                    <span className="text-monarch-orange">
                      {formatCurrency(target, { maximumFractionDigits: 0 })}/mo
                    </span>
                    <span className="text-monarch-text-muted"> → </span>
                    <span className="text-monarch-success">
                      {formatCurrency(idealRate, { maximumFractionDigits: 0 })}/mo
                    </span>
                  </div>
                  <div className="text-monarch-text-muted text-xs mt-1">
                    {item.frequency_months < 1
                      ? 'Normalizes as buffer builds'
                      : `Normalizes ${getNormalizationDate(item.next_due_date)}`}
                  </div>
                </>
              }
            >
              <span className="cursor-help text-monarch-error ml-1">
                <TrendUpIcon size={10} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
          {isAhead && (
            <Tooltip
              content={
                <>
                  <div className="font-medium flex items-center gap-1">
                    <TrendDownIcon size={12} strokeWidth={2.5} className="text-monarch-success" />{' '}
                    Ahead of Schedule
                  </div>
                  <div>
                    <span className="text-monarch-success">
                      {formatCurrency(target, { maximumFractionDigits: 0 })}/mo
                    </span>
                    <span className="text-monarch-text-muted"> → </span>
                    <span className="text-monarch-orange">
                      {formatCurrency(idealRate, { maximumFractionDigits: 0 })}/mo
                    </span>
                  </div>
                  <div className="text-monarch-text-muted text-xs mt-1">
                    {item.frequency_months < 1
                      ? 'Normalizes as buffer depletes'
                      : `Normalizes ${getNormalizationDate(item.next_due_date)}`}
                  </div>
                </>
              }
            >
              <span className="cursor-help text-monarch-success ml-1">
                <TrendDownIcon size={10} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
          {isStable && (
            <Tooltip
              content={
                <>
                  <div className="font-medium flex items-center gap-1">
                    <AnchorIcon size={12} strokeWidth={2.5} className="text-monarch-text-muted" />{' '}
                    Stable Target
                  </div>
                  <div className="text-monarch-text-muted text-xs">
                    This is the stable monthly target for this expense
                  </div>
                </>
              }
            >
              <span className="cursor-help text-monarch-text-muted ml-1">
                <AnchorIcon size={10} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
        </div>
        {showInterval && (
          <div className="text-xs text-monarch-text-muted text-right mt-0.5">
            {formatCurrency(item.amount, { maximumFractionDigits: 0 })}
            {formatFrequencyShort(item.frequency)}
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
          type="text"
          inputMode="numeric"
          value={budgetInput}
          onChange={handleBudgetChange}
          onKeyDown={handleBudgetKeyDown}
          onBlur={handleBudgetSubmit}
          onFocus={(e) => e.target.select()}
          disabled={isDisabled}
          placeholder="0"
          className="w-16 text-right font-medium text-monarch-text-dark bg-transparent font-inherit disabled:opacity-50 outline-none tabular-nums"
        />
        <span className="text-monarch-text-muted ml-1">/ {target}</span>
        {isCatchingUp && (
          <Tooltip
            content={
              <>
                <div className="font-medium flex items-center gap-1">
                  <TrendUpIcon size={12} strokeWidth={2.5} className="text-monarch-error" />{' '}
                  Catching Up
                </div>
                <div>
                  <span className="text-monarch-orange">
                    {formatCurrency(target, { maximumFractionDigits: 0 })}/mo
                  </span>
                  <span className="text-monarch-text-muted"> → </span>
                  <span className="text-monarch-success">
                    {formatCurrency(idealRate, { maximumFractionDigits: 0 })}/mo
                  </span>
                </div>
                <div className="text-monarch-text-muted text-xs mt-1">
                  {item.frequency_months < 1
                    ? 'Normalizes as buffer builds'
                    : `Normalizes ${getNormalizationDate(item.next_due_date)}`}
                </div>
              </>
            }
          >
            <span className="cursor-help text-monarch-error ml-1">
              <TrendUpIcon size={10} strokeWidth={2.5} />
            </span>
          </Tooltip>
        )}
        {isAhead && (
          <Tooltip
            content={
              <>
                <div className="font-medium flex items-center gap-1">
                  <TrendDownIcon size={12} strokeWidth={2.5} className="text-monarch-success" />{' '}
                  Ahead of Schedule
                </div>
                <div>
                  <span className="text-monarch-success">
                    {formatCurrency(target, { maximumFractionDigits: 0 })}/mo
                  </span>
                  <span className="text-monarch-text-muted"> → </span>
                  <span className="text-monarch-orange">
                    {formatCurrency(idealRate, { maximumFractionDigits: 0 })}/mo
                  </span>
                </div>
                <div className="text-monarch-text-muted text-xs mt-1">
                  {item.frequency_months < 1
                    ? 'Normalizes as buffer depletes'
                    : `Normalizes ${getNormalizationDate(item.next_due_date)}`}
                </div>
              </>
            }
          >
            <span className="cursor-help text-monarch-success ml-1">
              <TrendDownIcon size={10} strokeWidth={2.5} />
            </span>
          </Tooltip>
        )}
        {isStable && (
          <Tooltip
            content={
              <>
                <div className="font-medium flex items-center gap-1">
                  <AnchorIcon size={12} strokeWidth={2.5} className="text-monarch-text-muted" />{' '}
                  Stable Target
                </div>
                <div className="text-monarch-text-muted text-xs">
                  This is the stable monthly target for this expense
                </div>
              </>
            }
          >
            <span className="cursor-help text-monarch-text-muted ml-1">
              <AnchorIcon size={10} strokeWidth={2.5} />
            </span>
          </Tooltip>
        )}
      </div>
      {showInterval && (
        <div className="text-xs text-monarch-text-light text-right mt-0.5">
          {formatCurrency(item.amount, { maximumFractionDigits: 0 })}
          {formatFrequencyShort(item.frequency)}
        </div>
      )}
    </div>
  );
}
