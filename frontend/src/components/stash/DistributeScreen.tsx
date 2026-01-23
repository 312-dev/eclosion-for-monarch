/**
 * DistributeScreen Component
 *
 * A screen for distributing funds across stash items.
 * Used by DistributeWizard for both distribute and hypothesize modes.
 *
 * Features:
 * - Amount/Percent toggle for input mode
 * - Editable total amount (with optional max cap)
 * - Per-item allocation inputs
 * - Status indicator for remaining/over-allocated
 */

import { useState } from 'react';
import { DistributeItemRow } from './DistributeItemRow';
import { Icons } from '../icons';
import { Tooltip } from '../ui';
import type { StashItem } from '../../types';
import type { DistributeMode } from './DistributeWizard';

type InputMode = 'amount' | 'percent';

interface DistributeScreenProps {
  /** Mode: 'distribute' for real allocation, 'hypothesize' for what-if planning */
  readonly mode: DistributeMode;
  /** Total amount to distribute */
  readonly totalAmount: number;
  /** Maximum allowed amount (used in distribute mode) */
  readonly maxAmount?: number;
  /** Whether the total amount is editable */
  readonly isTotalEditable?: boolean;
  /** Callback when total amount changes */
  readonly onTotalChange?: (amount: number) => void;
  /** Current allocations by item ID */
  readonly allocations: Record<string, number>;
  /** Callback when an allocation changes */
  readonly onAllocationChange: (id: string, amount: number) => void;
  /** List of stash items to show */
  readonly items: StashItem[];
  /** Reset all allocations to zero */
  readonly onReset: () => void;
  /** Left to Budget amount (for displaying split info) */
  readonly leftToBudget?: number;
  /** Whether to show forecast projections (only on monthly step) */
  readonly showForecast?: boolean;
  /** Rollover allocations from Screen 1 (for calculating starting balance on Screen 2) */
  readonly rolloverAllocations?: Record<string, number>;
}

/**
 * Format currency for display.
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function DistributeScreen({
  mode,
  totalAmount,
  maxAmount,
  isTotalEditable = false,
  onTotalChange,
  allocations,
  onAllocationChange,
  items,
  onReset,
  leftToBudget,
  showForecast = false,
  rolloverAllocations,
}: DistributeScreenProps) {
  const [inputMode, setInputMode] = useState<InputMode>('amount');

  // Calculate total allocated and remaining
  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const remaining = totalAmount - totalAllocated;
  const isAtMax = maxAmount !== undefined && totalAmount >= maxAmount;

  // Calculate total percentage allocated
  const totalPercentAllocated = totalAmount > 0 ? Math.round((totalAllocated / totalAmount) * 100) : 0;
  const remainingPercent = 100 - totalPercentAllocated;

  // Handle allocation change from percentage input
  const handlePercentChange = (id: string, percent: number) => {
    const amount = Math.round((percent / 100) * totalAmount);
    onAllocationChange(id, amount);
  };

  // Get percentage for an item
  const getPercentForItem = (itemId: string): number => {
    const amount = allocations[itemId] ?? 0;
    if (totalAmount <= 0) return 0;
    return Math.round((amount / totalAmount) * 100);
  };

  // Round values to whole dollars for display
  const displayRemaining = Math.round(remaining);
  const displayTotalAmount = Math.round(totalAmount);

  // Calculate split preview (distribute mode only)
  const getSplitPreview = () => {
    if (mode !== 'distribute' || leftToBudget === undefined || totalAllocated === 0) return null;

    const rollover = Math.max(0, totalAllocated - leftToBudget);
    const budget = Math.min(totalAllocated, leftToBudget);

    if (rollover === 0) return null;

    return { rollover, budget };
  };

  const splitPreview = getSplitPreview();

  return (
    <div className="flex flex-col h-full">
      {/* Header section with total */}
      <div className="px-4 pt-2 pb-4">
        {/* Centered amount display/input */}
        <div className="flex flex-col items-center">
          {isTotalEditable ? (
            <div
              className={`flex items-center justify-center rounded-lg border-2 px-4 py-3 bg-monarch-bg-card transition-colors ${
                isAtMax ? 'border-monarch-warning' : 'border-monarch-border focus-within:border-monarch-orange'
              }`}
            >
              <span className="text-4xl font-semibold text-monarch-text-muted">$</span>
              <input
                type="number"
                value={displayTotalAmount || ''}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  onTotalChange?.(Number.isNaN(val) || val < 0 ? 0 : val);
                }}
                placeholder="0"
                className="w-32 text-center text-4xl font-semibold bg-transparent outline-none text-monarch-text-dark [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Total amount to distribute"
                min={0}
              />
            </div>
          ) : (
            <span className="text-4xl font-semibold text-monarch-text-dark">
              {formatCurrency(displayTotalAmount)}
            </span>
          )}

          {/* Max amount indicator (distribute mode) */}
          {maxAmount !== undefined && (
            <div className="mt-2 text-xs text-monarch-text-muted">
              Max: {formatCurrency(Math.round(maxAmount))}
            </div>
          )}
        </div>

        {/* Split preview (distribute mode, when there's a rollover component) */}
        {splitPreview && (
          <div className="mt-3 p-2 rounded-md bg-monarch-bg-hover text-xs">
            <div className="font-medium text-monarch-text-dark mb-1">How funds will be applied:</div>
            <div className="flex justify-between text-monarch-text-muted">
              <span>To category savings (rollover)</span>
              <span className="font-medium">{formatCurrency(splitPreview.rollover)}</span>
            </div>
            <div className="flex justify-between text-monarch-text-muted">
              <span>To monthly budgets</span>
              <span className="font-medium">{formatCurrency(splitPreview.budget)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-monarch-border">
          <span className="text-xs font-medium text-monarch-text-muted">Stashes</span>
          <div className="flex items-center gap-2">
            {/* Reset button */}
            <Tooltip content="Reset amounts">
              <button
                onClick={onReset}
                className="p-1.5 rounded-md text-monarch-text-muted hover:text-monarch-text-dark hover:bg-monarch-bg-hover transition-colors"
                aria-label="Reset amounts"
              >
                <Icons.Refresh size={14} />
              </button>
            </Tooltip>
            {/* Input mode toggle */}
            <div className="inline-flex rounded-full p-0.5 bg-monarch-bg-hover">
              <button
                onClick={() => setInputMode('amount')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  inputMode === 'amount'
                    ? 'bg-monarch-bg-card text-monarch-text-dark shadow-sm'
                    : 'text-monarch-text-muted hover:text-monarch-text-dark'
                }`}
              >
                By Amount
              </button>
              <button
                onClick={() => setInputMode('percent')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  inputMode === 'percent'
                    ? 'bg-monarch-bg-card text-monarch-text-dark shadow-sm'
                    : 'text-monarch-text-muted hover:text-monarch-text-dark'
                }`}
              >
                By Percent
              </button>
            </div>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="p-8 text-center text-monarch-text-muted">
            No stash items to distribute to.
          </div>
        ) : (
          <div className="divide-y divide-monarch-border">
            {items.map((item) => (
              <DistributeItemRow
                key={item.id}
                item={item}
                amount={allocations[item.id] ?? 0}
                percent={getPercentForItem(item.id)}
                onAmountChange={onAllocationChange}
                onPercentChange={handlePercentChange}
                inputMode={inputMode}
                showTargetInfo={true}
                showLiveProjection={showForecast}
                rolloverAmount={rolloverAllocations?.[item.id] ?? 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with remaining */}
      <div className="p-4 border-t flex items-center justify-center border-monarch-border">
        <div className="text-sm text-monarch-text-muted flex items-center gap-1.5">
          {inputMode === 'percent' && remainingPercent < 0 && (
            <>
              <Icons.Warning size={16} className="shrink-0 text-monarch-error" />
              <span><span className="font-bold text-monarch-error">{Math.abs(remainingPercent)}%</span> over. You went a little over!</span>
            </>
          )}
          {inputMode === 'percent' && remainingPercent === 0 && (
            <>
              <Icons.ThumbsUp size={16} className="shrink-0 text-monarch-success" />
              <span><span className="font-bold text-monarch-success">0%</span> left to distribute. Perfect.</span>
            </>
          )}
          {inputMode === 'percent' && remainingPercent > 0 && (
            <>
              <Icons.Banknote size={16} className="shrink-0 text-monarch-text-dark" />
              <span><span className="font-bold text-monarch-text-dark">{remainingPercent}%</span> left to distribute. Keep going!</span>
            </>
          )}
          {inputMode === 'amount' && displayRemaining < 0 && (
            <>
              <Icons.Warning size={16} className="shrink-0 text-monarch-error" />
              <span><span className="font-bold text-monarch-error">{formatCurrency(Math.abs(displayRemaining))}</span> over. You went a little over!</span>
            </>
          )}
          {inputMode === 'amount' && displayRemaining === 0 && (
            <>
              <Icons.ThumbsUp size={16} className="shrink-0 text-monarch-success" />
              <span><span className="font-bold text-monarch-success">$0</span> left to distribute. Perfect.</span>
            </>
          )}
          {inputMode === 'amount' && displayRemaining > 0 && (
            <>
              <Icons.Banknote size={16} className="shrink-0 text-monarch-text-dark" />
              <span><span className="font-bold text-monarch-text-dark">{formatCurrency(displayRemaining)}</span> left to distribute. Keep going!</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
