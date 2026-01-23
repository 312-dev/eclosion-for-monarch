/**
 * DistributeItemRow Component
 *
 * A single row for a stash item in the Distribute modal.
 * Styled like Monarch's split transaction rows with dark background and borders.
 *
 * Shows:
 * - Thumbnail image or emoji on left
 * - Name + target info in middle
 * - Budget input on right
 */

import React, { useState, useRef } from 'react';
import type { StashItem } from '../../types';

type InputMode = 'amount' | 'percent';

interface DistributeItemRowProps {
  /** The stash item data */
  readonly item: StashItem;
  /** Current allocated amount for this item */
  readonly amount: number;
  /** Current allocated percent for this item (0-100) */
  readonly percent?: number;
  /** Callback when user changes the amount */
  readonly onAmountChange: (id: string, amount: number) => void;
  /** Callback when user changes the percent */
  readonly onPercentChange?: (id: string, percent: number) => void;
  /** Input mode: amount or percent */
  readonly inputMode?: InputMode;
  /** Whether to show target info (target amount and date) */
  readonly showTargetInfo?: boolean;
  /** Whether to show live projection ("at this rate" calculation) - only on monthly step */
  readonly showLiveProjection?: boolean;
  /** Format a date string for display */
  readonly formatDate?: (dateString: string) => string;
  /** Rollover amount from Screen 1 (for calculating starting balance on Screen 2) */
  readonly rolloverAmount?: number;
}

/**
 * Calculate projected completion date based on current rate.
 */
function calculateProjectedDate(
  currentBalance: number,
  targetAmount: number,
  monthlyContribution: number
): Date | null {
  if (!targetAmount || monthlyContribution <= 0) return null;
  const remaining = targetAmount - currentBalance;
  if (remaining <= 0) return new Date(); // Already funded
  const monthsNeeded = Math.ceil(remaining / monthlyContribution);
  const projected = new Date();
  projected.setMonth(projected.getMonth() + monthsNeeded);
  return projected;
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

/**
 * Default date formatter.
 */
function defaultFormatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DistributeItemRow({
  item,
  amount,
  percent = 0,
  onAmountChange,
  onPercentChange,
  inputMode = 'amount',
  showTargetInfo = false,
  showLiveProjection = false,
  formatDate = defaultFormatDate,
  rolloverAmount = 0,
}: DistributeItemRowProps) {
  // Track the editing value separately from the controlled value
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Display the editing value when focused, otherwise show the external value based on mode
  const currentValue = inputMode === 'percent' ? percent : amount;
  const displayValue = editingValue ?? currentValue.toString();
  const isFocused = editingValue !== null;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setEditingValue(currentValue.toString());
    e.target.select();
  };

  const handleBlur = () => {
    if (editingValue === null) return;
    const parsed = Number.parseInt(editingValue, 10);
    const newValue = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setEditingValue(null);

    if (inputMode === 'percent') {
      // Clamp percent to 0-100
      const clampedPercent = Math.min(100, Math.max(0, newValue));
      if (clampedPercent !== percent) {
        onPercentChange?.(item.id, clampedPercent);
      }
    } else if (newValue !== amount) {
      onAmountChange(item.id, newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditingValue(null);
      inputRef.current?.blur();
    }
  };

  // New starting balance = current balance + rollover from Screen 1
  const newStartingBalance = item.current_balance + rolloverAmount;

  // Calculate projected date using:
  // - New starting balance (current + rollover from Screen 1)
  // - Monthly rate = amount allocated on this screen (Screen 2)
  const projectedDate =
    showLiveProjection && amount > 0
      ? calculateProjectedDate(newStartingBalance, item.amount, amount)
      : null;

  const targetDate = item.target_date ? new Date(item.target_date) : null;

  // Check if projected is different from target (more than 1 month)
  const showProjection =
    projectedDate &&
    targetDate &&
    Math.abs(projectedDate.getTime() - targetDate.getTime()) > 30 * 24 * 60 * 60 * 1000;

  // Determine target info content
  const renderTargetInfo = () => {
    if (item.amount && item.target_date) {
      return `Target: ${formatCurrency(item.amount)} by ${formatDate(item.target_date)}`;
    }
    if (item.amount) {
      return `Target: ${formatCurrency(item.amount)}`;
    }
    return 'No target set';
  };

  // Check if we have a valid image (not just truthy, but an actual URL)
  const hasValidImage = Boolean(
    item.custom_image_path?.startsWith('http') ||
    item.logo_url?.startsWith('http')
  );

  // Determine thumbnail content
  const thumbnailContent = (() => {
    if (!hasValidImage) return <span>{item.emoji || '🎯'}</span>;
    if (item.custom_image_path) {
      return (
        <img
          src={item.custom_image_path}
          alt=""
          className="w-full h-full object-cover rounded-xl"
        />
      );
    }
    return <img src={item.logo_url} alt="" className="w-6 h-6 object-contain" />;
  })();

  return (
    <div className="flex items-center gap-3 py-3 px-4 bg-monarch-bg-card hover:bg-monarch-bg-hover transition-colors">
      {/* Thumbnail / Emoji */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl bg-monarch-bg-page">
        {thumbnailContent}
      </div>

      {/* Name and target info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate text-monarch-text-dark">{item.name}</div>
        {showTargetInfo && (
          <div className="text-xs space-y-0.5 text-monarch-text-muted">
            <div>{renderTargetInfo()}</div>
            {showLiveProjection && showProjection && projectedDate && (
              <div className="text-monarch-warning">
                →{' '}
                {projectedDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                at this rate
              </div>
            )}
          </div>
        )}
      </div>

      {/* Amount/Percent input */}
      <div className="flex flex-col items-end shrink-0">
        <div
          className={`flex items-center rounded-md border px-2.5 py-1.5 bg-monarch-bg-card transition-colors ${
            isFocused ? 'border-monarch-orange' : 'border-monarch-border'
          }`}
        >
          {inputMode === 'amount' && (
            <span className="font-medium text-monarch-text-muted">$</span>
          )}
          <input
            ref={inputRef}
            type="number"
            value={displayValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-14 text-right font-medium bg-transparent outline-none text-monarch-text-dark [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            aria-label={inputMode === 'percent' ? `Percent for ${item.name}` : `Amount for ${item.name}`}
            min={0}
            max={inputMode === 'percent' ? 100 : undefined}
          />
          {inputMode === 'percent' && (
            <span className="font-medium text-monarch-text-muted">%</span>
          )}
          {inputMode === 'amount' && showLiveProjection && (
            <span className="font-medium text-monarch-text-muted ml-0.5">/ mo</span>
          )}
        </div>

        {/* Balance indicator - shown on monthly step (Screen 2) */}
        {showLiveProjection && newStartingBalance > 0 && (
          <div className="text-xs text-monarch-text-muted mt-1">
            + Balance of {formatCurrency(Math.round(newStartingBalance))}
          </div>
        )}
      </div>
    </div>
  );
}
