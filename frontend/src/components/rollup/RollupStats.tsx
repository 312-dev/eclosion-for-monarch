/**
 * Rollup Stats
 *
 * Stats display section showing budgeted and status, matching dedicated categories.
 */

import { useRef, useCallback, type KeyboardEvent } from 'react';
import { Tooltip } from '../ui/Tooltip';
import { StatusBadge } from '../ui';
import { TrendUpIcon, TrendDownIcon } from '../icons';
import { formatCurrency } from '../../utils';
import type { ItemStatus } from '../../types';

/** Get current month abbreviation (e.g., "Jan", "Feb") */
function getCurrentMonthAbbrev(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short' });
}

interface RollupStatsProps {
  readonly totalMonthly: number;
  readonly totalStable: number;
  readonly budgetValue: string;
  readonly isUpdatingBudget: boolean;
  readonly rollupStatus: ItemStatus;
  readonly anyCatchingUp: boolean;
  readonly anyAhead: boolean;
  readonly onBudgetValueChange: (value: string) => void;
  readonly onBudgetSubmit: () => Promise<void>;
  readonly onBudgetReset: () => void;
  readonly onFocus: () => void;
}

export function RollupStats({
  totalMonthly,
  totalStable,
  budgetValue,
  isUpdatingBudget,
  rollupStatus,
  anyCatchingUp,
  anyAhead,
  onBudgetValueChange,
  onBudgetSubmit,
  onBudgetReset,
  onFocus,
}: RollupStatsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Prevent event from bubbling up to parent accordion toggle
      e.stopPropagation();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      onBudgetReset();
      (e.target as HTMLInputElement).blur();
    }
  }, [onBudgetReset]);

  // Format the monthly target without decimal places
  const formattedMonthly = Math.ceil(totalMonthly);

  return (
    <div className="flex items-end gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
      {/* Budgeted - right-aligned like dedicated categories */}
      <div className="flex flex-col items-end">
        <span className="text-xs text-monarch-text-muted">{getCurrentMonthAbbrev()}. Budget</span>
        <div className="flex items-center whitespace-nowrap rounded bg-monarch-bg-card border border-monarch-border px-2 py-1 focus-within:border-monarch-orange">
          <span className="font-medium text-monarch-text-dark">$</span>
          <input
            ref={inputRef}
            type="number"
            value={budgetValue}
            onChange={(e) => onBudgetValueChange(e.target.value)}
            onBlur={onBudgetSubmit}
            onKeyDown={handleKeyDown}
            onFocus={(e) => { e.target.select(); onFocus(); }}
            disabled={isUpdatingBudget}
            aria-label="Monthly budget amount for rollup category"
            className="w-16 text-right font-medium text-monarch-text-dark bg-transparent font-inherit disabled:opacity-50 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            min="0"
            step="1"
          />
          <span className="text-monarch-text-muted ml-1 flex items-center gap-1">
            /
            {anyCatchingUp && (
              <Tooltip content={
                <>
                  <div className="font-medium flex items-center gap-1"><TrendUpIcon size={12} strokeWidth={2.5} className="text-monarch-error" /> Catching Up</div>
                  <div className="text-monarch-text-dark">{formatCurrency(totalMonthly, { maximumFractionDigits: 0 })}/mo → {formatCurrency(totalStable, { maximumFractionDigits: 0 })}/mo</div>
                  <div className="text-monarch-text-muted text-xs mt-1">Rate normalizes as billing cycles complete</div>
                </>
              }>
                <span className="cursor-help text-monarch-error">
                  <TrendUpIcon size={12} strokeWidth={2.5} />
                </span>
              </Tooltip>
            )}
            {!anyCatchingUp && anyAhead && (
              <Tooltip content={
                <>
                  <div className="font-medium flex items-center gap-1"><TrendDownIcon size={12} strokeWidth={2.5} className="text-monarch-success" /> Ahead of Schedule</div>
                  <div className="text-monarch-text-dark">{formatCurrency(totalMonthly, { maximumFractionDigits: 0 })}/mo → {formatCurrency(totalStable, { maximumFractionDigits: 0 })}/mo</div>
                  <div className="text-monarch-text-muted text-xs mt-1">Rate normalizes as billing cycles complete</div>
                </>
              }>
                <span className="cursor-help text-monarch-success">
                  <TrendDownIcon size={12} strokeWidth={2.5} />
                </span>
              </Tooltip>
            )}
            {formattedMonthly}
          </span>
        </div>
      </div>

      {/* Status - centered like dedicated categories */}
      <div className="text-center w-24">
        <span className="text-xs text-monarch-text-muted">Status</span>
        <div className="h-8 flex items-center justify-center">
          <StatusBadge status={rollupStatus} size="sm" />
        </div>
      </div>
    </div>
  );
}
