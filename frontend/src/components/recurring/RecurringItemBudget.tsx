/**
 * RecurringItemBudget - Editable budget input field with target display
 *
 * Shows budget/monthly target inline (e.g., "$ 5 / 10") and interval below for non-monthly.
 * The frozen_monthly_target is fixed for the month and doesn't change when budgeting.
 */

import React, { useState } from 'react';
import type { RecurringItem } from '../../types';
import { formatCurrency, formatFrequencyShort } from '../../utils';
import { TrendUpIcon, TrendDownIcon, AnchorIcon } from '../icons';
import { Tooltip } from '../ui/Tooltip';

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
            type="number"
            value={0}
            disabled
            readOnly
            className="w-16 text-right font-medium text-monarch-text-muted bg-transparent font-inherit cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-monarch-text-muted ml-1">/ {target}</span>
          {isCatchingUp && (
            <Tooltip content={
              <>
                <div className="font-medium flex items-center gap-1"><TrendUpIcon size={12} strokeWidth={2.5} className="text-monarch-error" /> Catching Up</div>
                <div>
                  <span className="text-monarch-orange">{formatCurrency(target, { maximumFractionDigits: 0 })}/mo</span>
                  <span className="text-monarch-text-muted"> → </span>
                  <span className="text-monarch-success">{formatCurrency(idealRate, { maximumFractionDigits: 0 })}/mo</span>
                </div>
                <div className="text-monarch-text-muted text-xs mt-1">
                  {item.frequency_months <= 1 ? 'Normalizes as buffer builds' : 'Normalizes next month'}
                </div>
              </>
            }>
              <span className="cursor-help text-monarch-error ml-1">
                <TrendUpIcon size={10} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
          {isAhead && (
            <Tooltip content={
              <>
                <div className="font-medium flex items-center gap-1"><TrendDownIcon size={12} strokeWidth={2.5} className="text-monarch-success" /> Ahead of Schedule</div>
                <div>
                  <span className="text-monarch-success">{formatCurrency(target, { maximumFractionDigits: 0 })}/mo</span>
                  <span className="text-monarch-text-muted"> → </span>
                  <span className="text-monarch-orange">{formatCurrency(idealRate, { maximumFractionDigits: 0 })}/mo</span>
                </div>
                <div className="text-monarch-text-muted text-xs mt-1">
                  {item.frequency_months <= 1 ? 'Normalizes as buffer depletes' : 'Normalizes next month'}
                </div>
              </>
            }>
              <span className="cursor-help text-monarch-success ml-1">
                <TrendDownIcon size={10} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
          {isStable && (
            <Tooltip content={
              <>
                <div className="font-medium flex items-center gap-1"><AnchorIcon size={12} strokeWidth={2.5} className="text-monarch-text-muted" /> Stable Target</div>
                <div className="text-monarch-text-muted text-xs">
                  This is the stable monthly target for this expense
                </div>
              </>
            }>
              <span className="cursor-help text-monarch-text-muted ml-1">
                <AnchorIcon size={10} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
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
        {isCatchingUp && (
          <Tooltip content={
            <>
              <div className="font-medium flex items-center gap-1"><TrendUpIcon size={12} strokeWidth={2.5} className="text-monarch-error" /> Catching Up</div>
              <div>
                <span className="text-monarch-orange">{formatCurrency(target, { maximumFractionDigits: 0 })}/mo</span>
                <span className="text-monarch-text-muted"> → </span>
                <span className="text-monarch-success">{formatCurrency(idealRate, { maximumFractionDigits: 0 })}/mo</span>
              </div>
              <div className="text-monarch-text-muted text-xs mt-1">
                {item.frequency_months <= 1 ? 'Normalizes as buffer builds' : 'Normalizes next month'}
              </div>
            </>
          }>
            <span className="cursor-help text-monarch-error ml-1">
              <TrendUpIcon size={10} strokeWidth={2.5} />
            </span>
          </Tooltip>
        )}
        {isAhead && (
          <Tooltip content={
            <>
              <div className="font-medium flex items-center gap-1"><TrendDownIcon size={12} strokeWidth={2.5} className="text-monarch-success" /> Ahead of Schedule</div>
              <div>
                <span className="text-monarch-success">{formatCurrency(target, { maximumFractionDigits: 0 })}/mo</span>
                <span className="text-monarch-text-muted"> → </span>
                <span className="text-monarch-orange">{formatCurrency(idealRate, { maximumFractionDigits: 0 })}/mo</span>
              </div>
              <div className="text-monarch-text-muted text-xs mt-1">
                {item.frequency_months <= 1 ? 'Normalizes as buffer depletes' : 'Normalizes next month'}
              </div>
            </>
          }>
            <span className="cursor-help text-monarch-success ml-1">
              <TrendDownIcon size={10} strokeWidth={2.5} />
            </span>
          </Tooltip>
        )}
        {isStable && (
          <Tooltip content={
            <>
              <div className="font-medium flex items-center gap-1"><AnchorIcon size={12} strokeWidth={2.5} className="text-monarch-text-muted" /> Stable Target</div>
              <div className="text-monarch-text-muted text-xs">
                This is the stable monthly target for this expense
              </div>
            </>
          }>
            <span className="cursor-help text-monarch-text-muted ml-1">
              <AnchorIcon size={10} strokeWidth={2.5} />
            </span>
          </Tooltip>
        )}
      </div>
      {showInterval && (
        <div className="text-xs text-monarch-text-light text-right mt-0.5">
          {formatCurrency(item.amount, { maximumFractionDigits: 0 })}{formatFrequencyShort(item.frequency)}
        </div>
      )}
    </div>
  );
}
