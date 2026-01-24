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

import React, { useState, useRef, useMemo } from 'react';
import type { StashItem, StashEvent } from '../../types';
import { Icons } from '../icons';
import { Tooltip } from '../ui';
import { UnitSelector } from './UnitSelector';
import { EventRow } from './EventRow';
import {
  calculateProjectedDateWithEvents,
  calculateMinimumRateWithEvents,
} from '../../utils/eventProjection';

type InputMode = 'amount' | 'percent';
type ScreenType = 'savings' | 'monthly';

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
  /** Callback when user changes the input mode */
  readonly onInputModeChange?: (mode: InputMode) => void;
  /** Whether to show target info (target amount and date) */
  readonly showTargetInfo?: boolean;
  /** Whether to show live projection ("per trajectory" calculation) - only on monthly step */
  readonly showLiveProjection?: boolean;
  /** Format a date string for display */
  readonly formatDate?: (dateString: string) => string;
  /** Rollover amount from Screen 1 (for calculating starting balance on Screen 2) */
  readonly rolloverAmount?: number;
  /** Screen type to determine suggestion logic */
  readonly screenType?: ScreenType;
  /** Callback to apply suggested amount */
  readonly onApplySuggestion?: (id: string, amount: number) => void;
  /** Events for this specific stash item (monthly screen only) */
  readonly itemEvents?: StashEvent[] | undefined;
  /** Callback to add an event */
  readonly onAddEvent?: (() => void) | undefined;
  /** Callback to update an event */
  readonly onUpdateEvent?: ((eventId: string, updates: Partial<StashEvent>) => void) | undefined;
  /** Callback to remove an event */
  readonly onRemoveEvent?: ((eventId: string) => void) | undefined;
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
 * Format a date with shorthand year ('27) or no year if current year.
 */
function formatDateShortYear(date: Date): string {
  const currentYear = new Date().getFullYear();
  const targetYear = date.getFullYear();

  const monthDay = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  if (targetYear === currentYear) {
    // Same year - hide year altogether
    return monthDay;
  }

  // Different year - use shorthand format ('27)
  const shortYear = `'${targetYear.toString().slice(-2)}`;
  return `${monthDay}, ${shortYear}`;
}

/**
 * Default date formatter.
 */
function defaultFormatDate(dateString: string): string {
  // Append T00:00:00 to interpret as local midnight, not UTC
  // Without this, '2026-06-01' becomes May 31st in western timezones
  const date = new Date(dateString + 'T00:00:00');
  return formatDateShortYear(date);
}

export function DistributeItemRow({
  item,
  amount,
  percent = 0,
  onAmountChange,
  onPercentChange,
  inputMode = 'amount',
  onInputModeChange,
  showTargetInfo = false,
  showLiveProjection = false,
  formatDate = defaultFormatDate,
  rolloverAmount = 0,
  screenType,
  onApplySuggestion,
  itemEvents = [],
  onAddEvent,
  onUpdateEvent,
  onRemoveEvent,
}: DistributeItemRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Display value based on mode
  const currentValue = inputMode === 'percent' ? percent : amount;
  const displayValue = currentValue === 0 ? '' : currentValue.toString();

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.target.select();
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const parsed = Number.parseInt(rawValue, 10);
    const newValue = rawValue === '' || Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;

    if (inputMode === 'percent') {
      // Clamp percent to 0-100
      const clampedPercent = Math.min(100, Math.max(0, newValue));
      onPercentChange?.(item.id, clampedPercent);
    } else {
      onAmountChange(item.id, newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      inputRef.current?.blur();
    }
    // Block negative sign and decimal point
    if (e.key === '-' || e.key === '.' || e.key === 'e') {
      e.preventDefault();
    }
  };

  // New starting balance = current balance + rollover from Screen 1
  const newStartingBalance = item.current_balance + rolloverAmount;

  // Calculate suggested amount based on screen type
  // Savings screen: suggest exact shortfall to become "funded"
  // Monthly screen: suggest monthly_target to stay "on track" (or $0 if already funded after rollover)
  // If events exist, calculate minimum rate needed given the planned events
  const suggestedAmount = (() => {
    if (!screenType) return null;
    if (screenType === 'savings') {
      // Shortfall = what's needed to fully fund the item
      return Math.max(0, item.amount - item.current_balance);
    }
    // Monthly screen: if already funded after rollover, suggest $0
    if (newStartingBalance >= item.amount) {
      return 0;
    }
    // If events exist and item has a target date, calculate event-aware minimum
    // This accounts for planned 1x deposits that reduce the needed monthly rate
    if (itemEvents.length > 0 && item.target_date) {
      return calculateMinimumRateWithEvents(
        newStartingBalance,
        item.amount,
        item.target_date,
        itemEvents
      );
    }
    // Otherwise suggest the monthly target
    return Math.max(0, item.monthly_target);
  })();

  // Show suggestion when user enters more than needed
  const showSuggestion = suggestedAmount !== null && onApplySuggestion && amount > suggestedAmount;

  // Calculate projected date using:
  // - New starting balance (current + rollover from Screen 1)
  // - Monthly rate = amount allocated on this screen (Screen 2)
  // - Events for hypothetical planning
  // Calculate projected date and track if projection was attempted but failed (won't reach in 10 years)
  const { projectedDate, projectionAttempted } = useMemo(() => {
    if (!showLiveProjection) return { projectedDate: null, projectionAttempted: false };

    // Check if there are any 1x events that contribute funds
    const has1xEvents = itemEvents.some((e) => e.type === '1x' && e.amount > 0);

    // Check if there are any /mo events that set a positive rate
    const hasMoEvents = itemEvents.some((e) => e.type === 'mo' && e.amount > 0);

    // Skip projection if no monthly rate AND no contributing events
    if (amount <= 0 && !has1xEvents && !hasMoEvents) return { projectedDate: null, projectionAttempted: false };

    // Always use event-aware calculation for consistency with "needed" hint
    const result = calculateProjectedDateWithEvents(
      newStartingBalance,
      item.amount,
      amount,
      itemEvents
    );
    return { projectedDate: result.projectedDate, projectionAttempted: true };
    // itemEvents is a readonly prop that won't be mutated externally
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [showLiveProjection, amount, newStartingBalance, item.amount, itemEvents]);

  // Append T00:00:00 to interpret as local midnight, not UTC
  const targetDate = item.target_date ? new Date(item.target_date + 'T00:00:00') : null;

  // Check if projected is different from target (more than 1 month), or if projection failed entirely
  const projectionWontReach = projectionAttempted && !projectedDate && targetDate;
  const showProjection =
    (projectedDate &&
      targetDate &&
      Math.abs(projectedDate.getTime() - targetDate.getTime()) > 30 * 24 * 60 * 60 * 1000) ||
    projectionWontReach;

  // Determine target info content - matches StashCard styling
  const renderTargetInfo = () => {
    if (!item.amount) {
      return <span>No target set</span>;
    }

    const isSavingsBuffer = item.goal_type === 'savings_buffer';
    const icon = isSavingsBuffer ? (
      <Icons.PiggyBank size={14} style={{ color: '#a78bfa' }} />
    ) : (
      <Icons.Gift size={14} style={{ color: '#60a5fa' }} />
    );
    const verb = isSavingsBuffer ? 'Maintain' : 'Save';
    const dateStr = item.target_date ? ` by ${formatDate(item.target_date)}` : '';

    return (
      <span className="flex items-center gap-1">
        {icon}
        <span>
          {verb} {formatCurrency(item.amount)}
          {dateStr}
        </span>
      </span>
    );
  };

  // Check if we have a valid image (not just truthy, but an actual URL)
  const hasValidImage = Boolean(
    item.custom_image_path?.startsWith('http') || item.logo_url?.startsWith('http')
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
    <div className="bg-monarch-bg-card hover:bg-monarch-bg-hover transition-colors">
      {/* Main row content */}
      <div className="flex items-center gap-3 py-3 px-4">
        {/* Thumbnail / Emoji */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl bg-monarch-bg-page">
          {thumbnailContent}
        </div>

        {/* Name and target info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate text-monarch-text-dark">{item.name}</div>
          {/* Balance badge - shows current vs new balance with flip animation */}
          <div className="relative h-6 my-1" style={{ perspective: '200px' }}>
            {/* Starting balance - flips down when contribution is added */}
            <div
              className="flex items-center w-fit px-2 py-1 rounded-full text-xs font-medium leading-none absolute inset-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--monarch-text-muted) 20%, transparent)',
                color: 'var(--monarch-text-muted)',
                transform: amount > 0 ? 'rotateX(90deg)' : 'rotateX(0deg)',
                opacity: amount > 0 ? 0 : 1,
                transition: 'transform 200ms ease-out, opacity 150ms ease-out',
                transformOrigin: 'bottom center',
                backfaceVisibility: 'hidden',
              }}
            >
              {formatCurrency(
                Math.round(showLiveProjection ? newStartingBalance : item.current_balance)
              )}{' '}
              stashed
              {showLiveProjection && (() => {
                const now = new Date();
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                return ` by ${lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
              })()}
            </div>
            {/* New balance - flips up when contribution is added */}
            <div
              className="flex items-center w-fit px-2 py-1 rounded-full text-xs font-medium leading-none absolute inset-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--monarch-success) 15%, transparent)',
                color: 'var(--monarch-success)',
                transform: amount > 0 ? 'rotateX(0deg)' : 'rotateX(-90deg)',
                opacity: amount > 0 ? 1 : 0,
                transition: 'transform 200ms ease-out, opacity 150ms ease-out',
                transformOrigin: 'top center',
                backfaceVisibility: 'hidden',
              }}
            >
              {formatCurrency(
                Math.round(
                  showLiveProjection
                    ? newStartingBalance + amount // Monthly: starting balance + monthly contribution
                    : item.current_balance + amount // Savings: current + one-time boost
                )
              )}{' '}
              stashed
              {showLiveProjection && (() => {
                const now = new Date();
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                return ` by ${lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
              })()}
            </div>
          </div>
          {showTargetInfo && (
            <div className="text-xs space-y-0.5 text-monarch-text-muted">
              <div>{renderTargetInfo()}</div>
              {showLiveProjection && showProjection && (() => {
                // Case 1: Won't reach goal within 10 years
                if (projectionWontReach) {
                  return (
                    <div
                      className="flex items-center gap-1"
                      style={{ color: 'var(--monarch-error)' }}
                    >
                      <Icons.ClockAlert size={12} />
                      <span>Won't reach goal in time</span>
                    </div>
                  );
                }
                // Case 2: Will reach, but at a different time than target
                if (projectedDate && targetDate) {
                  const isSooner = projectedDate.getTime() < targetDate.getTime();
                  return (
                    <div
                      className="flex items-center gap-1"
                      style={{ color: isSooner ? 'var(--monarch-success)' : 'var(--monarch-warning)' }}
                    >
                      {isSooner ? (
                        <Icons.ClockArrowDown size={12} />
                      ) : (
                        <Icons.ClockArrowUp size={12} />
                      )}
                      <span>{formatDateShortYear(projectedDate)} per trajectory</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>

        {/* Amount/Percent input */}
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-1">
            <div
              className={`flex items-center rounded-md border px-2.5 py-1.5 bg-monarch-bg-card transition-colors ${
                isFocused ? 'border-monarch-orange' : 'border-monarch-border'
              }`}
            >
              <UnitSelector mode={inputMode} onChange={onInputModeChange} />
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder="0"
                className="w-16 text-right font-medium bg-transparent outline-none text-monarch-text-dark placeholder:text-monarch-text-muted tabular-nums"
                aria-label={
                  inputMode === 'percent' ? `Percent for ${item.name}` : `Amount for ${item.name}`
                }
              />
              {inputMode === 'amount' && showLiveProjection && (
                <span className="font-medium text-monarch-text-muted ml-0.5">/ mo</span>
              )}
            </div>
          </div>
          {/* Suggestion hint when user enters excessive amount */}
          {showSuggestion && (
            <Tooltip
              content={
                itemEvents.length > 0
                  ? 'You only need to contribute this amount to reach your goal in time due to upcoming events for this stash'
                  : 'You only need to contribute this amount to reach your goal in time'
              }
            >
              <button
                type="button"
                onClick={() => onApplySuggestion(item.id, suggestedAmount)}
                className="flex items-center gap-1 mt-1 text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                aria-label={`Apply suggested amount of ${formatCurrency(suggestedAmount)}`}
              >
                <Icons.Lightbulb size={12} />
                <span>{formatCurrency(suggestedAmount)} instead</span>
              </button>
            </Tooltip>
          )}
          {/* "Needed" hint when current rate is insufficient to reach goal on time */}
          {(() => {
            // Only show on monthly screen with a target date
            if (!showLiveProjection || !item.target_date || !onApplySuggestion) return null;
            // Already funded - no hint needed
            if (newStartingBalance >= item.amount) return null;
            // Calculate the monthly rate required to reach goal by target date
            const requiredMonthlyRate = calculateMinimumRateWithEvents(
              newStartingBalance,
              item.amount,
              item.target_date,
              itemEvents
            );
            // Only show if current amount is less than required
            if (amount >= requiredMonthlyRate) return null;
            return (
              <Tooltip content="Click to set the monthly amount needed to reach your goal on time">
                <button
                  type="button"
                  onClick={() => onApplySuggestion(item.id, requiredMonthlyRate)}
                  className="flex items-center gap-1 mt-1 text-xs transition-colors cursor-pointer"
                  style={{ color: 'var(--monarch-warning)' }}
                  aria-label={`Apply required amount of ${formatCurrency(requiredMonthlyRate)} per month`}
                >
                  <Icons.Sparkles size={12} />
                  <span>{formatCurrency(requiredMonthlyRate)}/mo needed</span>
                </button>
              </Tooltip>
            );
          })()}

          {/* Events section - only on monthly screen, right-aligned under input */}
          {showLiveProjection && (
            <div className="flex flex-col items-end mt-1">
              {/* Existing events */}
              {itemEvents.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onUpdate={(updates) => onUpdateEvent?.(event.id, updates)}
                  onRemove={() => onRemoveEvent?.(event.id)}
                />
              ))}

              {/* Add event link */}
              {itemEvents.length < 10 && onAddEvent && (
                <button
                  type="button"
                  onClick={onAddEvent}
                  className="flex items-center gap-1 text-xs transition-colors text-monarch-text-muted hover:text-monarch-orange"
                >
                  <Icons.Plus size={12} />
                  <span className="hover:underline">Add event</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
