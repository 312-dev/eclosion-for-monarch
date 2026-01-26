/* eslint-disable max-lines */
/**
 * Available Funds Bar
 *
 * A standalone container showing Available Funds with the Distribute button.
 * Includes buffer input in the breakdown tooltip.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useLayoutEffect,
  type ChangeEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../icons';
import {
  useAvailableToStash,
  useStashConfigQuery,
  useUpdateStashConfigMutation,
} from '../../api/queries';
import { HoverCard } from '../ui/HoverCard';
import { BreakdownDetailModal } from './BreakdownDetailModal';
import { BreakdownRow, ExpectedIncomeRow, BREAKDOWN_LABELS } from './BreakdownComponents';
import { BufferInputRow } from './BufferInputRow';
import { DistributeButton, HypothesizeButton } from './DistributeButton';
import { useToast } from '../../context/ToastContext';
import { useDistributionMode } from '../../context/DistributionModeContext';
import { useAnimatedValue } from '../../hooks';
import { UI, STORAGE_KEYS } from '../../constants';
import { formatCurrency } from '../../utils/formatters';
import type { StashItem } from '../../types';

/** Position options for the floating bar */
type BarPosition = 'left' | 'center' | 'right';

/** Load saved position from localStorage */
function loadSavedPosition(): BarPosition {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FUNDS_BAR_POSITION);
    if (saved === 'left' || saved === 'center' || saved === 'right') {
      return saved;
    }
  } catch {
    // localStorage may be unavailable
  }
  return 'center';
}

/** Save position to localStorage */
function savePosition(position: BarPosition): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FUNDS_BAR_POSITION, position);
  } catch {
    // localStorage may be unavailable
  }
}

/** Currency formatting options for whole dollars */
const currencyOpts = { maximumFractionDigits: 0 };

interface AvailableFundsBarProps {
  /** Left to Budget amount (ready_to_assign from Monarch) */
  readonly leftToBudget: number;
  /** List of stash items for the distribute button */
  readonly items: StashItem[];
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- Complex component with drag functionality
export function AvailableFundsBar({ leftToBudget, items }: Readonly<AvailableFundsBarProps>) {
  const toast = useToast();
  const {
    mode,
    customAvailableFunds,
    setCustomAvailableFunds,
    customLeftToBudget,
    setCustomLeftToBudget,
    totalStashedAllocated,
    totalMonthlyAllocated,
  } = useDistributionMode();
  const isHypothesizeMode = mode === 'hypothesize';
  const isInDistributionMode = mode !== null;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const prevValueRef = useRef<number | null>(null);

  // Position state for snap-to-corner behavior
  const [position, setPosition] = useState<BarPosition>(loadSavedPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; width: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ grabOffsetX: number } | null>(null);

  // Get config for settings and mutation for saving
  // Read directly from query to ensure immediate updates after mutations
  const { data: config } = useStashConfigQuery();
  const updateConfig = useUpdateStashConfigMutation();
  const includeExpectedIncome = config?.includeExpectedIncome ?? false;
  const bufferAmount = config?.bufferAmount ?? 0;

  const { data, rawData, isLoading } = useAvailableToStash({
    includeExpectedIncome,
    bufferAmount,
  });

  // Calculate raw expected income regardless of toggle setting
  const rawExpectedIncome = rawData ? Math.max(0, rawData.plannedIncome - rawData.actualIncome) : 0;

  const breakdown = data?.breakdown;
  const detailedBreakdown = data?.detailedBreakdown;

  // Calculate available before any buffer
  const availableBeforeBuffer = useMemo(() => {
    if (!breakdown) return 0;
    return (
      breakdown.cashOnHand +
      breakdown.expectedIncome -
      breakdown.creditCardDebt -
      breakdown.unspentBudgets -
      breakdown.goalBalances -
      breakdown.stashBalances
    );
  }, [breakdown]);

  // Calculate available with saved buffer
  const displayedAvailable = availableBeforeBuffer - bufferAmount;
  const isPositive = displayedAvailable >= 0;
  const displayedStatusColor = isPositive ? 'var(--monarch-success)' : 'var(--monarch-error)';
  const displayedFormattedAmount = formatCurrency(displayedAvailable, currencyOpts);

  // State for hypothesize mode input
  const [isInputFocused, setIsInputFocused] = useState(false);
  const hypothesizeInputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [inputWidth, setInputWidth] = useState(60);

  // Get display value for Cash to Stash
  // When focused: show total available (editable)
  // When not focused: show remaining (total - stashed allocations)
  const baseAvailableFunds = customAvailableFunds ?? displayedAvailable;
  const remainingFunds = isInDistributionMode
    ? baseAvailableFunds - totalStashedAllocated
    : baseAvailableFunds;
  const displayFunds = isInputFocused ? baseAvailableFunds : remainingFunds;

  // Get display value for Left to Budget
  // When focused: show total LTB (editable)
  // When not focused: show remaining (total - monthly allocations)
  // Left to Budget state for hypothesize mode
  const [isLtbInputFocused, setIsLtbInputFocused] = useState(false);
  const ltbInputRef = useRef<HTMLInputElement>(null);
  const ltbMeasureRef = useRef<HTMLSpanElement>(null);
  const [ltbInputWidth, setLtbInputWidth] = useState(60);

  // Calculate Left to Budget values
  const baseLeftToBudget = customLeftToBudget ?? leftToBudget;
  const remainingLtb = isInDistributionMode
    ? baseLeftToBudget - totalMonthlyAllocated
    : baseLeftToBudget;
  const displayLtb = isLtbInputFocused ? baseLeftToBudget : remainingLtb;

  // Animate the remaining funds for distribute mode countdown effect
  const animatedRemainingFunds = useAnimatedValue(remainingFunds, { duration: 250 });
  const isDisplayNegative = displayFunds < 0;
  const hypothesizeDisplayValue = Math.abs(displayFunds).toLocaleString('en-US');

  // Measure text width for hypothesize input (Cash to Stash)
  useLayoutEffect(() => {
    if (measureRef.current && isHypothesizeMode) {
      setInputWidth(measureRef.current.offsetWidth);
    }
  }, [hypothesizeDisplayValue, isHypothesizeMode]);

  // Measure text width for hypothesize input (Left to Budget)
  const ltbHypothesizeDisplayValue = Math.abs(displayLtb).toLocaleString('en-US');
  useLayoutEffect(() => {
    if (ltbMeasureRef.current && isHypothesizeMode) {
      setLtbInputWidth(ltbMeasureRef.current.offsetWidth);
    }
  }, [ltbHypothesizeDisplayValue, isHypothesizeMode]);

  // Auto-focus hypothesize input when entering mode
  useEffect(() => {
    if (isHypothesizeMode && hypothesizeInputRef.current) {
      hypothesizeInputRef.current.focus();
      const len = hypothesizeInputRef.current.value.length;
      hypothesizeInputRef.current.setSelectionRange(len, len);
    }
  }, [isHypothesizeMode]);

  // Track transitions to negative for shake animation
  useEffect(() => {
    if (!data) return;

    const prevValue = prevValueRef.current;
    const currentValue = displayedAvailable;

    // Update ref first
    prevValueRef.current = currentValue;

    // Trigger shake when transitioning from positive (or null) to negative
    if (currentValue < 0 && (prevValue === null || prevValue >= 0)) {
      const frame = requestAnimationFrame(() => {
        setShouldShake(true);
      });
      const timer = setTimeout(() => setShouldShake(false), UI.ANIMATION.SLOW);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
  }, [data, displayedAvailable]);

  // Save buffer to config
  const saveBuffer = useCallback(
    async (value: number) => {
      try {
        await updateConfig.mutateAsync({ bufferAmount: value });
      } catch {
        toast.error('Failed to save buffer amount');
      }
    },
    [updateConfig, toast]
  );

  // Toggle expected income setting
  const handleToggleExpectedIncome = useCallback(async () => {
    try {
      await updateConfig.mutateAsync({ includeExpectedIncome: !includeExpectedIncome });
    } catch {
      toast.error('Failed to update setting');
    }
  }, [updateConfig, includeExpectedIncome, toast]);

  const openModal = () => setIsModalOpen(true);

  // Calculate position for snap based on drag location
  const calculateSnapPosition = useCallback((mouseX: number): BarPosition => {
    // Get content area bounds (right of sidebar)
    const contentLeft = sidebarWidth;
    const contentRight = window.innerWidth;
    const contentWidth = contentRight - contentLeft;

    // Calculate relative position within content area (0-1)
    const relativeX = (mouseX - contentLeft) / contentWidth;

    // Snap thresholds: left third, middle third, right third
    if (relativeX < 0.33) return 'left';
    if (relativeX > 0.67) return 'right';
    return 'center';
  }, []);

  // Handle drag start - track where user grabbed relative to card
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    // Store the offset from the card's left edge to where the user clicked
    const grabOffsetX = e.clientX - rect.left;

    dragStartRef.current = { grabOffsetX };
    setIsDragging(true);
    // Store the card's current position and width so it doesn't shrink during drag
    setDragOffset({ x: rect.left, width: rect.width });
  }, []);

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !dragOffset) return;

      const { grabOffsetX } = dragStartRef.current;
      // Position card so the grab point stays under the mouse
      const newLeft = e.clientX - grabOffsetX;
      setDragOffset({ x: newLeft, width: dragOffset.width });
    };

    const handleMouseUp = (e: MouseEvent) => {
      const newPosition = calculateSnapPosition(e.clientX);
      setPosition(newPosition);
      savePosition(newPosition);
      setIsDragging(false);
      setDragOffset(null);
      dragStartRef.current = null;
    };

    globalThis.addEventListener('mousemove', handleMouseMove);
    globalThis.addEventListener('mouseup', handleMouseUp);

    return () => {
      globalThis.removeEventListener('mousemove', handleMouseMove);
      globalThis.removeEventListener('mouseup', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dragOffset is intentionally read from closure during drag
  }, [isDragging, calculateSnapPosition]);

  const tooltipContent =
    breakdown && detailedBreakdown ? (
      <div className="text-sm space-y-2 min-w-56">
        <div
          className="font-medium border-b pb-1 mb-2"
          style={{ borderColor: 'var(--monarch-border)' }}
        >
          Calculation Breakdown
        </div>
        <div className="space-y-1">
          <ExpectedIncomeRow
            amount={rawExpectedIncome}
            isEnabled={includeExpectedIncome}
            onToggle={handleToggleExpectedIncome}
          />
          <BreakdownRow
            label={BREAKDOWN_LABELS.cashOnHand}
            amount={breakdown.cashOnHand}
            isPositive
            items={detailedBreakdown.cashAccounts}
            onExpand={openModal}
          />
          <BreakdownRow
            label={BREAKDOWN_LABELS.goalBalances}
            amount={breakdown.goalBalances}
            items={detailedBreakdown.goals}
            onExpand={openModal}
          />
          <BreakdownRow
            label={BREAKDOWN_LABELS.creditCardDebt}
            amount={breakdown.creditCardDebt}
            items={detailedBreakdown.creditCards}
            onExpand={openModal}
          />
          <BreakdownRow
            label={BREAKDOWN_LABELS.unspentBudgets}
            amount={breakdown.unspentBudgets}
            items={detailedBreakdown.unspentCategories}
            onExpand={openModal}
          />
          <BreakdownRow
            label={BREAKDOWN_LABELS.stashBalances}
            amount={breakdown.stashBalances}
            items={detailedBreakdown.stashItems}
            onExpand={openModal}
          />
          <BufferInputRow
            availableBeforeBuffer={availableBeforeBuffer}
            savedBuffer={bufferAmount}
            onSave={saveBuffer}
          />
        </div>
        <div
          className="flex justify-between font-medium pt-2 border-t"
          style={{ borderColor: 'var(--monarch-border)' }}
        >
          <span>Available</span>
          <span style={{ color: displayedStatusColor }}>{displayedFormattedAmount}</span>
        </div>
      </div>
    ) : null;

  // Shared box shadow style for the floating card - pronounced with wide spread
  const cardShadow =
    '0 -12px 48px rgba(0, 0, 0, 0.25), 0 -4px 16px rgba(0, 0, 0, 0.15), 0 0 80px rgba(0, 0, 0, 0.1)';

  // Sidebar width for centering calculation
  const sidebarWidth = 220;

  // Calculate positioning styles for the container
  const getContainerStyles = useCallback((): React.CSSProperties => {
    // Snap positions with smooth transition
    const baseStyles: React.CSSProperties = {
      left: sidebarWidth,
      transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    };

    switch (position) {
      case 'left':
        return { ...baseStyles, justifyContent: 'flex-start', paddingLeft: '2rem' };
      case 'right':
        return { ...baseStyles, justifyContent: 'flex-end', paddingRight: '2rem' };
      case 'center':
      default:
        return { ...baseStyles, justifyContent: 'center' };
    }
  }, [position, isDragging]);

  // Calculate styles for the card (applies drag offset when dragging)
  const getCardStyles = useCallback((): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      backgroundColor: 'var(--monarch-bg-card)',
      border: '1px solid var(--monarch-border)',
      boxShadow: cardShadow,
    };

    if (isDragging && dragOffset) {
      return {
        ...baseStyles,
        position: 'fixed',
        left: dragOffset.x,
        bottom: 72,
        width: dragOffset.width,
        transition: 'none',
      };
    }

    return {
      ...baseStyles,
      transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    };
  }, [isDragging, dragOffset, cardShadow]);

  const floatingBar = createPortal(
    <>
      {/* Vignette gradient - full width, behind footer (z-10) */}
      <div
        className="fixed bottom-0 left-0 right-0 h-64 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, var(--monarch-bg-page) 0%, var(--monarch-bg-page) 40%, transparent 100%)',
        }}
      />
      {/* Fixed floating card - positioned based on user preference */}
      <div
        className="fixed bottom-18 right-0 z-40 flex pointer-events-none"
        style={getContainerStyles()}
      >
        <div
          ref={cardRef}
          className={`group pointer-events-auto rounded-xl overflow-hidden relative ${shouldShake ? 'animate-error-shake' : ''}`}
          style={getCardStyles()}
        >
          {/* Drag handle - top edge */}
          <div className="flex justify-center py-1">
            <button
              type="button"
              className="flex gap-0.5 px-2 py-0.5 cursor-grab active:cursor-grabbing rounded-md transition-opacity opacity-40 hover:opacity-80 focus-visible:opacity-80 focus-visible:ring-2 focus-visible:ring-(--monarch-orange) outline-none"
              onMouseDown={handleDragStart}
              aria-label={`Reposition widget. Currently ${position}. Use arrow keys to move.`}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const newPos = position === 'right' ? 'center' : 'left';
                  setPosition(newPos);
                  savePosition(newPos);
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  const newPos = position === 'left' ? 'center' : 'right';
                  setPosition(newPos);
                  savePosition(newPos);
                }
              }}
            >
              <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
              <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
              <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
              <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
              <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
              <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
            </button>
          </div>

          {/* Horizontal layout: Left info | Center buttons | Right info */}
          <div className="flex items-stretch justify-center relative">
            {/* External link to Monarch - top right of content area, shows on hover */}
            <a
              href="https://app.monarchmoney.com/plan"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-1 right-1.5 p-0.5 rounded opacity-0 group-hover:opacity-50 hover:opacity-100! transition-opacity"
              aria-label="Open Monarch budget plan"
            >
              <Icons.ExternalLink size={10} style={{ color: 'var(--monarch-text-muted)' }} />
            </a>
            {/* Left: Cash to Stash - fixed width */}
            <div
              className="flex flex-col items-center justify-center py-2 px-3 w-44"
              style={{
                backgroundColor: (() => {
                  if (isLoading) return 'var(--monarch-bg-card)';
                  if (isPositive)
                    return 'color-mix(in srgb, var(--monarch-success) 10%, var(--monarch-bg-card))';
                  return 'color-mix(in srgb, var(--monarch-error) 10%, var(--monarch-bg-card))';
                })(),
              }}
            >
              <span
                className="text-xs font-medium mb-0.5"
                style={{
                  color: isLoading ? 'var(--monarch-text-muted)' : displayedStatusColor,
                  opacity: 0.7,
                }}
              >
                Cash to Stash
              </span>
              <div className="flex items-center gap-1.5">
                <Icons.Landmark
                  size={16}
                  style={{
                    color: isLoading ? 'var(--monarch-text-muted)' : displayedStatusColor,
                    opacity: 0.8,
                  }}
                  aria-hidden="true"
                />
                {isLoading && (
                  <div
                    className="h-6 w-16 rounded animate-pulse"
                    style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
                  />
                )}
                {!isLoading && isHypothesizeMode && (
                  <div
                    className={`relative flex items-center px-2 py-0.5 rounded-lg transition-all duration-200 ${isInputFocused ? 'ring-2 ring-purple-400' : ''}`}
                    style={{
                      backgroundColor: 'rgba(147, 51, 234, 0.15)',
                      border: '1px solid rgba(147, 51, 234, 0.5)',
                    }}
                  >
                    <span
                      className="text-base font-bold"
                      style={{ color: isDisplayNegative ? '#e11d48' : 'white' }}
                    >
                      {isDisplayNegative ? '-$' : '$'}
                    </span>
                    <span
                      ref={measureRef}
                      className="absolute invisible whitespace-pre text-base font-bold tabular-nums"
                      aria-hidden="true"
                    >
                      {hypothesizeDisplayValue || '0'}
                    </span>
                    <input
                      ref={hypothesizeInputRef}
                      type="text"
                      inputMode="numeric"
                      value={hypothesizeDisplayValue}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const digitsOnly = e.target.value.replaceAll(/\D/g, '');
                        const val = digitsOnly === '' ? 0 : Number.parseInt(digitsOnly, 10);
                        setCustomAvailableFunds(val);
                      }}
                      onFocus={() => {
                        setIsInputFocused(true);
                        hypothesizeInputRef.current?.select();
                      }}
                      onBlur={() => setIsInputFocused(false)}
                      className="text-base font-bold tabular-nums bg-transparent outline-none text-right"
                      style={{
                        width: Math.max(inputWidth, 24),
                        color: isDisplayNegative ? '#e11d48' : 'white',
                      }}
                      aria-label="Custom available funds amount"
                    />
                  </div>
                )}
                {!isLoading && !isHypothesizeMode && (
                  <HoverCard content={tooltipContent} side="top" align="center" closeDelay={400}>
                    {mode === 'distribute' ? (
                      // Distribute mode: show animated countdown of remaining funds
                      <span
                        className="text-lg font-bold tabular-nums"
                        style={{
                          color:
                            remainingFunds < 0 ? 'var(--monarch-error)' : 'var(--monarch-success)',
                        }}
                      >
                        {formatCurrency(animatedRemainingFunds, currencyOpts)}
                      </span>
                    ) : (
                      // Normal mode: show available amount
                      <span
                        className="text-lg font-bold tabular-nums cursor-help"
                        style={{ color: displayedStatusColor }}
                      >
                        {displayedFormattedAmount}
                      </span>
                    )}
                  </HoverCard>
                )}
              </div>
            </div>

            {/* Center: Stacked icon buttons - stretch to fill height */}
            <div className="flex flex-col self-stretch">
              {isLoading ? (
                <div
                  className="flex items-center justify-center flex-1 px-2.5 rounded-t-md animate-pulse"
                  style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
                >
                  <Icons.Split size={16} style={{ opacity: 0.5 }} />
                </div>
              ) : (
                <DistributeButton
                  availableAmount={displayedAvailable}
                  items={items}
                  compact
                  iconOnly
                  groupPosition="top"
                />
              )}
              <HypothesizeButton items={items} compact iconOnly groupPosition="bottom" />
            </div>

            {/* Right: Left to Budget - fixed width */}
            {(() => {
              // In distribution modes, show remaining LTB (after monthly allocations)
              // In hypothesize mode with custom value, use custom value as base
              const ltbIsNegative = displayLtb < 0;
              const ltbIsPositive = displayLtb >= 0;
              const ltbStatusColor = ltbIsPositive
                ? 'var(--monarch-success)'
                : 'var(--monarch-error)';

              const ltbBgColor = (() => {
                if (isLoading) return 'var(--monarch-bg-card)';
                if (ltbIsPositive)
                  return 'color-mix(in srgb, var(--monarch-success) 10%, var(--monarch-bg-card))';
                return 'color-mix(in srgb, var(--monarch-error) 10%, var(--monarch-bg-card))';
              })();

              return (
                <div
                  className="flex flex-col items-center justify-center py-2 px-3 w-44"
                  style={{ backgroundColor: ltbBgColor }}
                >
                  <span
                    className="text-xs font-medium mb-0.5"
                    style={{
                      color: isLoading ? 'var(--monarch-text-muted)' : ltbStatusColor,
                      opacity: 0.7,
                    }}
                  >
                    Left to Budget
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Icons.Banknote
                      size={16}
                      style={{
                        color: isLoading ? 'var(--monarch-text-muted)' : ltbStatusColor,
                        opacity: 0.8,
                      }}
                      aria-hidden="true"
                    />
                    {isLoading && (
                      <div
                        className="h-6 w-12 rounded animate-pulse"
                        style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
                      />
                    )}
                    {!isLoading && isHypothesizeMode && (
                      <div
                        className={`relative flex items-center px-2 py-0.5 rounded-lg transition-all duration-200 ${isLtbInputFocused ? 'ring-2 ring-purple-400' : ''}`}
                        style={{
                          backgroundColor: 'rgba(147, 51, 234, 0.15)',
                          border: '1px solid rgba(147, 51, 234, 0.5)',
                        }}
                      >
                        <span
                          className="text-base font-bold"
                          style={{ color: ltbIsNegative ? '#e11d48' : 'white' }}
                        >
                          {ltbIsNegative ? '-$' : '$'}
                        </span>
                        <span
                          ref={ltbMeasureRef}
                          className="absolute invisible whitespace-pre text-base font-bold tabular-nums"
                          aria-hidden="true"
                        >
                          {ltbHypothesizeDisplayValue || '0'}
                        </span>
                        <input
                          ref={ltbInputRef}
                          type="text"
                          inputMode="numeric"
                          value={ltbHypothesizeDisplayValue}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const digitsOnly = e.target.value.replaceAll(/\D/g, '');
                            const val = digitsOnly === '' ? 0 : Number.parseInt(digitsOnly, 10);
                            setCustomLeftToBudget(val);
                          }}
                          onFocus={() => {
                            setIsLtbInputFocused(true);
                            ltbInputRef.current?.select();
                          }}
                          onBlur={() => setIsLtbInputFocused(false)}
                          className="text-base font-bold tabular-nums bg-transparent outline-none text-right"
                          style={{
                            width: Math.max(ltbInputWidth, 24),
                            color: ltbIsNegative ? '#e11d48' : 'white',
                          }}
                          aria-label="Custom left to budget amount"
                        />
                      </div>
                    )}
                    {!isLoading && !isHypothesizeMode && (
                      <span
                        className="text-lg font-bold tabular-nums"
                        style={{ color: ltbStatusColor }}
                      >
                        {formatCurrency(remainingLtb, currencyOpts)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </>,
    document.body
  );

  return (
    <>
      {floatingBar}
      {data && (
        <BreakdownDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={data}
          statusColor={displayedStatusColor}
          formattedAmount={displayedFormattedAmount}
        />
      )}
    </>
  );
}
