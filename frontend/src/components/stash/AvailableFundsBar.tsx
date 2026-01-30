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
import { UI } from '../../constants';
import { formatCurrency } from '../../utils/formatters';
import type { StashItem } from '../../types';

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
    startingStashTotal,
  } = useDistributionMode();
  const isHypothesizeMode = mode === 'hypothesize';
  const isInDistributionMode = mode !== null;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const prevValueRef = useRef<number | null>(null);

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
  // Icon color uses theme-aware variables for better contrast in light mode
  const displayedIconColor = isPositive
    ? 'var(--status-icon-positive)'
    : 'var(--status-icon-negative)';
  const displayedFormattedAmount = formatCurrency(displayedAvailable, currencyOpts);

  // State for hypothesize mode input
  const [isInputFocused, setIsInputFocused] = useState(false);
  const hypothesizeInputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [inputWidth, setInputWidth] = useState(60);

  // Get display value for Cash to Stash
  // When focused: show total available (editable)
  // When not focused: show remaining (total - delta from starting allocations)
  // We use the delta (totalStashedAllocated - startingStashTotal) because
  // stash balances are already subtracted in the main calculation.
  // This avoids double-counting when entering distribution mode.
  const baseAvailableFunds = customAvailableFunds ?? displayedAvailable;
  const stashAllocationDelta = totalStashedAllocated - startingStashTotal;
  const remainingFunds = isInDistributionMode
    ? baseAvailableFunds - stashAllocationDelta
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

  // Calculate LTB breakdown values using the leftToBudget PROP (from dashboard) as the source of truth
  // The breakdown.leftToBudget comes from a separate query and may be out of sync
  const budgetedIncome = detailedBreakdown?.leftToBudgetDetail[0]?.amount ?? 0;
  const budgetedCategories = detailedBreakdown?.leftToBudgetDetail[1]?.amount ?? 0;
  // Calculate savings & other based on: income - categories - LTB = savings
  const calculatedSavingsAndOther = budgetedIncome - budgetedCategories - leftToBudget;
  const showSavingsLine = Math.abs(Math.round(calculatedSavingsAndOther)) >= 1;

  // Calculate running totals for breakdown display
  const runningTotals = breakdown
    ? {
        afterExpectedIncome: breakdown.expectedIncome,
        afterCash: breakdown.expectedIncome + breakdown.cashOnHand,
        afterGoals: breakdown.expectedIncome + breakdown.cashOnHand - breakdown.goalBalances,
        afterCC:
          breakdown.expectedIncome +
          breakdown.cashOnHand -
          breakdown.goalBalances -
          breakdown.creditCardDebt,
        afterUnspent:
          breakdown.expectedIncome +
          breakdown.cashOnHand -
          breakdown.goalBalances -
          breakdown.creditCardDebt -
          breakdown.unspentBudgets,
        afterStash:
          breakdown.expectedIncome +
          breakdown.cashOnHand -
          breakdown.goalBalances -
          breakdown.creditCardDebt -
          breakdown.unspentBudgets -
          breakdown.stashBalances,
      }
    : null;

  const tooltipContent =
    breakdown && detailedBreakdown && runningTotals ? (
      <div className="text-sm space-y-2 min-w-72">
        <div className="space-y-1">
          <ExpectedIncomeRow
            amount={rawExpectedIncome}
            isEnabled={includeExpectedIncome}
            onToggle={handleToggleExpectedIncome}
            runningTotal={runningTotals.afterExpectedIncome}
          />
          <BreakdownRow
            label={BREAKDOWN_LABELS.cashOnHand}
            amount={breakdown.cashOnHand}
            isPositive
            items={detailedBreakdown.cashAccounts}
            onExpand={openModal}
            runningTotal={runningTotals.afterCash}
          />
          <BreakdownRow
            label={BREAKDOWN_LABELS.goalBalances}
            amount={breakdown.goalBalances}
            items={detailedBreakdown.goals}
            onExpand={openModal}
            runningTotal={runningTotals.afterGoals}
          />
          <BreakdownRow
            label={BREAKDOWN_LABELS.creditCardDebt}
            amount={breakdown.creditCardDebt}
            items={detailedBreakdown.creditCards}
            onExpand={openModal}
            runningTotal={runningTotals.afterCC}
          />
          <BreakdownRow
            label={BREAKDOWN_LABELS.unspentBudgets}
            amount={breakdown.unspentBudgets}
            items={detailedBreakdown.unspentCategories}
            onExpand={openModal}
            runningTotal={runningTotals.afterUnspent}
          />
          <BreakdownRow
            label={BREAKDOWN_LABELS.stashBalances}
            amount={breakdown.stashBalances}
            items={detailedBreakdown.stashItems}
            onExpand={openModal}
            runningTotal={runningTotals.afterStash}
          />
          <BufferInputRow
            availableBeforeBuffer={availableBeforeBuffer}
            savedBuffer={bufferAmount}
            onSave={saveBuffer}
            runningTotal={displayedAvailable}
          />
        </div>
        <div
          className="flex justify-between font-medium pt-2 border-t"
          style={{ borderColor: 'var(--monarch-border)' }}
        >
          <span>Cash to Stash</span>
          <span style={{ color: displayedStatusColor }}>{displayedFormattedAmount}</span>
        </div>
      </div>
    ) : null;

  // LTB running totals
  const ltbRunningTotals = {
    afterIncome: budgetedIncome,
    afterCategories: budgetedIncome - budgetedCategories,
    afterSavings: budgetedIncome - budgetedCategories - calculatedSavingsAndOther,
  };

  // LTB tooltip for the right side of the floating bar (uses same calculated values as above)
  const ltbTooltipContent =
    breakdown && detailedBreakdown ? (
      <div className="text-sm space-y-2 min-w-72">
        <div className="space-y-1">
          <div className="flex justify-between items-center gap-2">
            <span className="flex-1" style={{ color: 'var(--monarch-text-muted)' }}>
              Budgeted income
            </span>
            <span
              className="tabular-nums text-right"
              style={{ color: 'var(--monarch-green)', minWidth: '4.5rem' }}
            >
              +{formatCurrency(budgetedIncome, currencyOpts)}
            </span>
            <span
              className="tabular-nums text-right"
              style={{ color: 'var(--monarch-text-muted)', minWidth: '4.5rem', opacity: 0.7 }}
            >
              {formatCurrency(ltbRunningTotals.afterIncome, currencyOpts)}
            </span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="flex-1" style={{ color: 'var(--monarch-text-muted)' }}>
              Budgeted categories
            </span>
            <span
              className="tabular-nums text-right"
              style={{ color: 'var(--monarch-red)', minWidth: '4.5rem' }}
            >
              -{formatCurrency(budgetedCategories, currencyOpts)}
            </span>
            <span
              className="tabular-nums text-right"
              style={{ color: 'var(--monarch-text-muted)', minWidth: '4.5rem', opacity: 0.7 }}
            >
              {formatCurrency(ltbRunningTotals.afterCategories, currencyOpts)}
            </span>
          </div>
          {showSavingsLine && (
            <div className="flex justify-between items-center gap-2">
              <span className="flex-1" style={{ color: 'var(--monarch-text-muted)' }}>
                Savings & other
              </span>
              <span
                className="tabular-nums text-right"
                style={{ color: 'var(--monarch-red)', minWidth: '4.5rem' }}
              >
                -{formatCurrency(calculatedSavingsAndOther, currencyOpts)}
              </span>
              <span
                className="tabular-nums text-right"
                style={{ color: 'var(--monarch-text-muted)', minWidth: '4.5rem', opacity: 0.7 }}
              >
                {formatCurrency(ltbRunningTotals.afterSavings, currencyOpts)}
              </span>
            </div>
          )}
        </div>
        <div
          className="flex justify-between font-medium pt-2 border-t"
          style={{ borderColor: 'var(--monarch-border)' }}
        >
          <span>Left to Budget</span>
          <span
            style={{
              color: leftToBudget >= 0 ? 'var(--monarch-success)' : 'var(--monarch-error)',
            }}
          >
            {formatCurrency(leftToBudget, currencyOpts)}
          </span>
        </div>
      </div>
    ) : null;

  // Shared box shadow style for the floating card - uses page background color to match vignette gradient
  const cardShadow =
    '0 -12px 48px color-mix(in srgb, var(--monarch-bg-page) 60%, transparent), 0 -4px 16px color-mix(in srgb, var(--monarch-bg-page) 40%, transparent), 0 0 80px color-mix(in srgb, var(--monarch-bg-page) 25%, transparent)';

  const floatingBar = createPortal(
    <>
      {/* Vignette gradient - offset by sidebar on desktop, behind footer (z-10) */}
      <div
        className="fixed bottom-0 left-0 md:left-55 right-0 h-64 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, var(--monarch-bg-page) 0%, var(--monarch-bg-page) 40%, transparent 100%)',
        }}
      />
      {/* Fixed floating card - always centered */}
      {/* Desktop: offset by sidebar width (220px), bottom-18 for footer */}
      {/* Mobile: full width centered, bottom-20 for mobile nav */}
      <div className="fixed left-0 right-0 md:left-55 bottom-20 md:bottom-18 z-30 flex justify-center pointer-events-none">
        <div
          data-tour="stash-available-funds"
          className={`group pointer-events-auto rounded-xl overflow-hidden relative ${shouldShake ? 'animate-error-shake' : ''}`}
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            boxShadow: cardShadow,
          }}
        >
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
                  if (isPositive) return 'var(--monarch-success-bg)';
                  return 'var(--monarch-error-bg)';
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
                {(isLoading || isHypothesizeMode) && (
                  <Icons.MoneyBills
                    size={16}
                    style={{
                      color: isLoading ? 'var(--monarch-text-muted)' : displayedIconColor,
                    }}
                    aria-hidden="true"
                  />
                )}
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
                      backgroundColor: 'var(--hypothesize-input-bg)',
                      border: '1px solid var(--hypothesize-input-border)',
                    }}
                  >
                    <span
                      className="text-base font-bold"
                      style={{
                        color: isDisplayNegative
                          ? 'var(--monarch-error)'
                          : 'var(--hypothesize-input-text)',
                      }}
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
                        color: isDisplayNegative
                          ? 'var(--monarch-error)'
                          : 'var(--hypothesize-input-text)',
                      }}
                      aria-label="Custom available funds amount"
                    />
                  </div>
                )}
                {!isLoading && !isHypothesizeMode && (
                  <HoverCard content={tooltipContent} side="top" align="center" closeDelay={400}>
                    <div className="flex items-center gap-1.5 cursor-help">
                      <Icons.MoneyBills
                        size={16}
                        style={{
                          color: displayedIconColor,
                        }}
                        aria-hidden="true"
                      />
                      {mode === 'distribute' ? (
                        // Distribute mode: show animated countdown of remaining funds
                        <span
                          className="text-lg font-bold tabular-nums"
                          style={{
                            color:
                              remainingFunds < 0
                                ? 'var(--monarch-error)'
                                : 'var(--monarch-success)',
                          }}
                        >
                          {formatCurrency(animatedRemainingFunds, currencyOpts)}
                        </span>
                      ) : (
                        // Normal mode: show available amount
                        <span
                          className="text-lg font-bold tabular-nums"
                          style={{ color: displayedStatusColor }}
                        >
                          {displayedFormattedAmount}
                        </span>
                      )}
                    </div>
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
                <span data-tour="stash-distribute-mode" className="contents">
                  <DistributeButton items={items} compact iconOnly groupPosition="top" />
                </span>
              )}
              <span data-tour="stash-hypothesize-mode" className="contents">
                <HypothesizeButton items={items} compact iconOnly groupPosition="bottom" />
              </span>
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
              // Icon color uses theme-aware variables for better contrast in light mode
              const ltbIconColor = ltbIsPositive
                ? 'var(--status-icon-positive)'
                : 'var(--status-icon-negative)';

              const ltbBgColor = (() => {
                if (isLoading) return 'var(--monarch-bg-card)';
                if (ltbIsPositive) return 'var(--monarch-success-bg)';
                return 'var(--monarch-error-bg)';
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
                  {isLoading && (
                    <div className="flex items-center gap-1.5">
                      <Icons.CircleFadingPlus
                        size={16}
                        style={{ color: 'var(--monarch-text-muted)', opacity: 0.8 }}
                        aria-hidden="true"
                      />
                      <div
                        className="h-6 w-12 rounded animate-pulse"
                        style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
                      />
                    </div>
                  )}
                  {!isLoading && isHypothesizeMode && (
                    <div className="flex items-center gap-1.5">
                      <Icons.CircleFadingPlus
                        size={16}
                        style={{ color: ltbIconColor }}
                        aria-hidden="true"
                      />
                      <div
                        className={`relative flex items-center px-2 py-0.5 rounded-lg transition-all duration-200 ${isLtbInputFocused ? 'ring-2 ring-purple-400' : ''}`}
                        style={{
                          backgroundColor: 'var(--hypothesize-input-bg)',
                          border: '1px solid var(--hypothesize-input-border)',
                        }}
                      >
                        <span
                          className="text-base font-bold"
                          style={{
                            color: ltbIsNegative
                              ? 'var(--monarch-error)'
                              : 'var(--hypothesize-input-text)',
                          }}
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
                            color: ltbIsNegative
                              ? 'var(--monarch-error)'
                              : 'var(--hypothesize-input-text)',
                          }}
                          aria-label="Custom left to budget amount"
                        />
                      </div>
                    </div>
                  )}
                  {!isLoading && !isHypothesizeMode && (
                    <HoverCard
                      content={ltbTooltipContent}
                      side="top"
                      align="center"
                      closeDelay={400}
                    >
                      <div className="flex items-center gap-1.5 cursor-help">
                        <Icons.CircleFadingPlus
                          size={16}
                          style={{ color: ltbIconColor }}
                          aria-hidden="true"
                        />
                        <span
                          className="text-lg font-bold tabular-nums"
                          style={{ color: ltbStatusColor }}
                        >
                          {formatCurrency(remainingLtb, currencyOpts)}
                        </span>
                      </div>
                    </HoverCard>
                  )}
                </div>
              );
            })()}
          </div>
          {/* Footer: Combined total - subtle darkened background */}
          {!isLoading &&
            (() => {
              const combinedTotal = remainingFunds + remainingLtb;
              const isPositiveTotal = combinedTotal >= 0;
              const totalAvailableTooltip = (
                <div className="text-sm space-y-2 min-w-72">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <span className="flex-1" style={{ color: 'var(--monarch-text-muted)' }}>
                        Cash to Stash
                      </span>
                      <span
                        className="tabular-nums text-right"
                        style={{
                          color:
                            remainingFunds >= 0 ? 'var(--monarch-green)' : 'var(--monarch-red)',
                          minWidth: '4.5rem',
                        }}
                      >
                        {remainingFunds >= 0 ? '+' : ''}
                        {formatCurrency(remainingFunds, currencyOpts)}
                      </span>
                      <span
                        className="tabular-nums text-right"
                        style={{
                          color: 'var(--monarch-text-muted)',
                          minWidth: '4.5rem',
                          opacity: 0.7,
                        }}
                      >
                        {formatCurrency(remainingFunds, currencyOpts)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="flex-1" style={{ color: 'var(--monarch-text-muted)' }}>
                        Left to Budget
                      </span>
                      <span
                        className="tabular-nums text-right"
                        style={{
                          color: remainingLtb >= 0 ? 'var(--monarch-green)' : 'var(--monarch-red)',
                          minWidth: '4.5rem',
                        }}
                      >
                        {remainingLtb >= 0 ? '+' : ''}
                        {formatCurrency(remainingLtb, currencyOpts)}
                      </span>
                      <span
                        className="tabular-nums text-right"
                        style={{
                          color: 'var(--monarch-text-muted)',
                          minWidth: '4.5rem',
                          opacity: 0.7,
                        }}
                      >
                        {formatCurrency(combinedTotal, currencyOpts)}
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex justify-between font-medium pt-2 border-t"
                    style={{ borderColor: 'var(--monarch-border)' }}
                  >
                    <span>Total</span>
                    <span
                      style={{
                        color: isPositiveTotal ? 'var(--monarch-success)' : 'var(--monarch-error)',
                      }}
                    >
                      {formatCurrency(combinedTotal, currencyOpts)}
                    </span>
                  </div>
                </div>
              );
              return (
                <div
                  className="flex items-center justify-center gap-1 py-1 px-3 border-t text-xs"
                  style={{
                    borderColor: 'var(--monarch-border)',
                    backgroundColor: 'var(--monarch-bg-hover)',
                    color: 'var(--monarch-text-muted)',
                  }}
                >
                  <span>Total Commitable: </span>
                  <HoverCard content={totalAvailableTooltip} side="top" align="center">
                    <span
                      className="font-medium tabular-nums cursor-help"
                      style={{
                        color: isPositiveTotal ? 'var(--monarch-success)' : 'var(--monarch-error)',
                      }}
                    >
                      {formatCurrency(combinedTotal, currencyOpts)}
                    </span>
                  </HoverCard>
                </div>
              );
            })()}
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
