/**
 * Rollup Stats
 *
 * Stats display section showing budgeted and status, matching dedicated categories.
 */

import { useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import { Tooltip } from '../ui/Tooltip';
import { StatusBadge } from '../ui';
import { TrendUpIcon, TrendDownIcon } from '../icons';
import { formatCurrency } from '../../utils';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useDataMonth, formatMonthShort } from '../../context/MonthTransitionContext';
import type { ItemStatus } from '../../types';

/**
 * Format input value with commas as user types.
 * Strips non-digits and formats with locale-aware commas.
 */
function formatInputWithCommas(rawInput: string): string {
  const digitsOnly = rawInput.replaceAll(/\D/g, '');
  if (digitsOnly === '') return '';
  const numericValue = Number.parseInt(digitsOnly, 10);
  return numericValue.toLocaleString('en-US');
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
  const isRateLimited = useIsRateLimited();
  const dataMonth = useDataMonth();
  const monthLabel = formatMonthShort(dataMonth);

  // Disable input when updating or rate limited
  const isDisabled = isUpdatingBudget || isRateLimited;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const formatted = formatInputWithCommas(e.target.value);
      onBudgetValueChange(formatted);
    },
    [onBudgetValueChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        // Prevent event from bubbling up to parent accordion toggle
        e.stopPropagation();
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        onBudgetReset();
        (e.target as HTMLInputElement).blur();
      }
    },
    [onBudgetReset]
  );

  // Format the monthly target without decimal places
  const formattedMonthly = Math.ceil(totalMonthly);

  return (
    <div className="flex items-end gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
      {/* Budgeted - right-aligned like dedicated categories */}
      <div className="flex flex-col items-end">
        <span className="text-xs text-monarch-text-muted">{monthLabel}. Budget</span>
        <div className="flex items-center whitespace-nowrap rounded bg-monarch-bg-card border border-monarch-border px-2 py-1 focus-within:border-monarch-orange">
          <span className="font-medium text-monarch-text-dark">$</span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={budgetValue}
            onChange={handleChange}
            onBlur={onBudgetSubmit}
            onKeyDown={handleKeyDown}
            onFocus={(e) => {
              e.target.select();
              onFocus();
            }}
            disabled={isDisabled}
            placeholder="0"
            aria-label="Monthly budget amount for rollup category"
            className="w-16 text-right font-medium text-monarch-text-dark bg-transparent font-inherit disabled:opacity-50 outline-none tabular-nums"
          />
          <span className="text-monarch-text-muted ml-1 flex items-center gap-1">
            /
            {anyCatchingUp && (
              <Tooltip
                content={
                  <>
                    <div className="font-medium flex items-center gap-1">
                      <TrendUpIcon size={12} strokeWidth={2.5} className="text-monarch-error" />{' '}
                      Catching Up
                    </div>
                    <div className="text-monarch-text-dark">
                      {formatCurrency(totalMonthly, { maximumFractionDigits: 0 })}/mo →{' '}
                      {formatCurrency(totalStable, { maximumFractionDigits: 0 })}/mo
                    </div>
                    <div className="text-monarch-text-muted text-xs mt-1">
                      Rate normalizes as billing cycles complete
                    </div>
                  </>
                }
              >
                <span className="cursor-help text-monarch-error">
                  <TrendUpIcon size={12} strokeWidth={2.5} />
                </span>
              </Tooltip>
            )}
            {!anyCatchingUp && anyAhead && (
              <Tooltip
                content={
                  <>
                    <div className="font-medium flex items-center gap-1">
                      <TrendDownIcon size={12} strokeWidth={2.5} className="text-monarch-success" />{' '}
                      Ahead of Schedule
                    </div>
                    <div className="text-monarch-text-dark">
                      {formatCurrency(totalMonthly, { maximumFractionDigits: 0 })}/mo →{' '}
                      {formatCurrency(totalStable, { maximumFractionDigits: 0 })}/mo
                    </div>
                    <div className="text-monarch-text-muted text-xs mt-1">
                      Rate normalizes as billing cycles complete
                    </div>
                  </>
                }
              >
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
