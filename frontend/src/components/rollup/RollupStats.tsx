/**
 * Rollup Stats
 *
 * Stats display section showing monthly, budgeted, total cost, and status.
 */

import { useRef, useCallback, type KeyboardEvent } from 'react';
import { Tooltip } from '../ui/Tooltip';
import { StatusBadge } from '../ui';
import { TrendUpIcon, TrendDownIcon } from '../icons';
import { formatCurrency } from '../../utils';
import type { ItemStatus } from '../../types';

interface RollupStatsProps {
  readonly totalMonthly: number;
  readonly totalStable: number;
  readonly totalAmount: number;
  readonly budgeted: number;
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
  totalAmount,
  budgeted,
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
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      onBudgetReset();
      (e.target as HTMLInputElement).blur();
    }
  }, [onBudgetReset]);

  return (
    <div className="flex items-start gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
      {/* Monthly */}
      <div className="text-center w-20 sm:w-24">
        <span className="text-xs text-monarch-text-muted">Monthly</span>
        <div className="h-8 font-medium flex items-center justify-center gap-1 text-monarch-text-dark">
          {anyCatchingUp && (
            <Tooltip content={
              <>
                <div className="font-medium">Catching Up</div>
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
                <div className="font-medium">Ahead of Schedule</div>
                <div className="text-monarch-text-dark">{formatCurrency(totalMonthly, { maximumFractionDigits: 0 })}/mo → {formatCurrency(totalStable, { maximumFractionDigits: 0 })}/mo</div>
                <div className="text-monarch-text-muted text-xs mt-1">Rate normalizes as billing cycles complete</div>
              </>
            }>
              <span className="cursor-help text-monarch-success">
                <TrendDownIcon size={12} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
          {formatCurrency(totalMonthly, { maximumFractionDigits: 0 })}
        </div>
      </div>

      {/* Budgeted */}
      <div className="text-center w-20 sm:w-24">
        <span className="text-xs text-monarch-text-muted">Budgeted</span>
        <div className="relative h-8 flex items-center">
          <span className="absolute left-2 font-medium text-monarch-text-dark">$</span>
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
            aria-describedby={Math.ceil(budgeted) < Math.ceil(totalMonthly) ? 'rollup-budget-warning' : undefined}
            className={`w-20 sm:w-24 h-8 pl-5 pr-2 text-right rounded font-medium text-monarch-text-dark bg-monarch-bg-card font-inherit border ${Math.ceil(budgeted) < Math.ceil(totalMonthly) ? 'border-monarch-warning' : 'border-monarch-border'}`}
            min="0"
            step="1"
          />
        </div>
        {Math.ceil(budgeted) < Math.ceil(totalMonthly) && (
          <div id="rollup-budget-warning" className="text-[10px] mt-0.5 text-monarch-warning" role="alert">
            need {formatCurrency(Math.ceil(totalMonthly), { maximumFractionDigits: 0 })}
          </div>
        )}
      </div>

      {/* Total Cost */}
      <div className="text-center w-20 sm:w-24">
        <span className="text-xs text-monarch-text-muted">Total Cost</span>
        <div className="h-8 font-medium flex items-center justify-center text-monarch-text-dark">
          {formatCurrency(totalAmount, { maximumFractionDigits: 0 })}
        </div>
      </div>

      {/* Status */}
      <div className="text-center">
        <span className="text-xs text-monarch-text-muted">Status</span>
        <div className="h-8 flex items-center justify-center">
          <StatusBadge status={rollupStatus} size="sm" />
        </div>
      </div>
    </div>
  );
}
