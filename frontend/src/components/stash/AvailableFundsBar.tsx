/**
 * Available Funds Bar
 *
 * A standalone container showing Available Funds with the Distribute button.
 * Includes buffer input in the breakdown tooltip.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { UI } from '../../constants';
import type { StashItem } from '../../types';

/** Format currency with no decimals */
function formatCurrency(amount: number): string {
  const prefix = amount < 0 ? '-' : '';
  return `${prefix}$${Math.abs(amount).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

interface AvailableFundsBarProps {
  /** Whether to include expected income in calculation (from settings) */
  readonly includeExpectedIncome?: boolean;
  /** Reserved buffer amount to subtract from available (from settings) */
  readonly bufferAmount?: number;
  /** Left to Budget amount (ready_to_assign from Monarch) */
  readonly leftToBudget: number;
  /** List of stash items for the distribute button */
  readonly items: StashItem[];
}

export function AvailableFundsBar({
  includeExpectedIncome = false,
  bufferAmount = 0,
  leftToBudget,
  items,
}: Readonly<AvailableFundsBarProps>) {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const prevValueRef = useRef<number | null>(null);

  // Get config for buffer and mutation for saving
  const { data: config } = useStashConfigQuery();
  const updateConfig = useUpdateStashConfigMutation();
  const savedBuffer = config?.bufferAmount ?? 0;

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
  const displayedAvailable = availableBeforeBuffer - savedBuffer;
  const isPositive = displayedAvailable >= 0;
  const displayedStatusColor = isPositive ? 'var(--monarch-success)' : 'var(--monarch-error)';
  const displayedFormattedAmount = formatCurrency(displayedAvailable);

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
            savedBuffer={savedBuffer}
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

  if (isLoading) {
    return createPortal(
      <>
        {/* Vignette gradient - full width, behind footer (z-10) */}
        <div
          className="fixed bottom-0 left-0 right-0 h-64 z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, var(--monarch-bg-page) 0%, var(--monarch-bg-page) 40%, transparent 100%)',
          }}
        />
        {/* Fixed floating card - centered in content area (right of sidebar) */}
        <div
          className="fixed bottom-18 right-0 z-40 flex justify-center pointer-events-none"
          style={{ left: sidebarWidth }}
        >
          <div
            className="pointer-events-auto flex items-center justify-center rounded-xl px-6 py-4 max-w-75 w-full mx-4 animate-pulse"
            style={{
              backgroundColor: 'var(--monarch-bg-card)',
              border: '1px solid var(--monarch-border)',
              boxShadow: cardShadow,
            }}
          >
            <div
              className="h-8 w-24 rounded"
              style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
            />
          </div>
        </div>
      </>,
      document.body
    );
  }

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
      {/* Fixed floating card - centered in content area (right of sidebar) */}
      <div
        className="fixed bottom-18 right-0 z-40 flex justify-center pointer-events-none"
        style={{ left: sidebarWidth }}
      >
        <div
          className={`pointer-events-auto rounded-xl overflow-hidden max-w-75 w-full mx-4 ${shouldShake ? 'animate-error-shake' : ''}`}
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            boxShadow: cardShadow,
          }}
        >
          {/* Header section */}
          <div
            className="flex items-center justify-center gap-2 px-4 py-2"
            style={{ borderBottom: '1px solid var(--monarch-border)' }}
          >
            <Icons.Landmark
              size={16}
              style={{ color: 'var(--monarch-text-muted)' }}
              aria-hidden="true"
            />
            <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-muted)' }}>
              Available Funds
            </span>
          </div>

          {/* Amount section */}
          <div
            className="flex items-center justify-center px-4 py-3"
            style={{ borderBottom: '1px solid var(--monarch-border)' }}
          >
            <HoverCard content={tooltipContent} side="top" align="center" closeDelay={400}>
              <div className="flex items-center gap-2 cursor-help">
                <span
                  className="text-3xl font-bold tabular-nums"
                  style={{ color: displayedStatusColor }}
                >
                  {displayedFormattedAmount}
                </span>
                <Icons.Info size={16} style={{ color: 'var(--monarch-text-muted)' }} />
              </div>
            </HoverCard>
          </div>

          {/* Button group section */}
          <div className="flex">
            <HypothesizeButton
              availableAmount={displayedAvailable}
              leftToBudget={leftToBudget}
              items={items}
              compact
              groupPosition="left"
            />
            <DistributeButton
              availableAmount={displayedAvailable}
              leftToBudget={leftToBudget}
              items={items}
              compact
              groupPosition="right"
            />
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
