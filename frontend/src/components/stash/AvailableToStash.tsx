/**
 * Available Funds Display
 *
 * Shows the calculated "Available Funds" amount - money the user can
 * safely allocate to Stash items without disrupting their budget.
 *
 * See .claude/rules/available-to-stash.md for calculation details.
 */

import { useState, useEffect, useRef } from 'react';
import { Icons } from '../icons';
import { useAvailableToStash } from '../../api/queries';
import { HoverCard } from '../ui/HoverCard';
import { BreakdownDetailModal } from './BreakdownDetailModal';
import { BreakdownRow, BREAKDOWN_LABELS } from './BreakdownComponents';
import { UI } from '../../constants';

type DisplayMode = 'header' | 'compact';

interface AvailableToStashProps {
  /** Display mode: 'header' for page header, 'compact' for inline display */
  readonly mode?: DisplayMode;
  /** Whether to include expected income in calculation (from settings) */
  readonly includeExpectedIncome?: boolean;
  /** Reserved buffer amount to subtract from available (from settings) */
  readonly bufferAmount?: number;
}

/**
 * Display the Available Funds amount with optional breakdown tooltip.
 */
export function AvailableToStash({
  mode = 'header',
  includeExpectedIncome = false,
  bufferAmount = 0,
}: Readonly<AvailableToStashProps>) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const prevValueRef = useRef<number | null>(null);

  const { data, isLoading, formattedAmount, statusColor } = useAvailableToStash({
    includeExpectedIncome,
    bufferAmount,
  });

  // Track transitions to negative for shake animation
  useEffect(() => {
    if (!data) return;

    const prevValue = prevValueRef.current;
    const currentValue = data.available;

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
  }, [data]);

  if (isLoading) {
    if (mode === 'compact') {
      return (
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded text-sm animate-pulse"
          style={{ backgroundColor: 'var(--monarch-bg-card)' }}
        >
          <div className="h-3.5 w-16 rounded" style={{ backgroundColor: 'var(--monarch-bg-hover)' }} />
          <div className="h-3.5 w-14 rounded" style={{ backgroundColor: 'var(--monarch-bg-hover)' }} />
        </div>
      );
    }
    // Header mode skeleton
    return (
      <div className="flex items-center gap-3 animate-pulse">
        {/* Icon placeholder */}
        <div className="w-7 h-7 rounded" style={{ backgroundColor: 'var(--monarch-bg-hover)' }} />
        {/* Badge placeholder */}
        <div
          className="rounded-lg px-4 py-1.5 flex flex-col items-center gap-0.5"
          style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
        >
          <div className="h-7 w-20 rounded" style={{ backgroundColor: 'var(--monarch-bg-page)' }} />
          <div className="h-3 w-24 rounded" style={{ backgroundColor: 'var(--monarch-bg-page)' }} />
        </div>
        {/* Info icon placeholder */}
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--monarch-bg-hover)' }} />
      </div>
    );
  }

  const breakdown = data?.breakdown;
  const detailedBreakdown = data?.detailedBreakdown;

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
          {includeExpectedIncome && breakdown.expectedIncome > 0 && (
            <BreakdownRow
              label={BREAKDOWN_LABELS.expectedIncome}
              amount={breakdown.expectedIncome}
              isPositive
            />
          )}
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
          {breakdown.bufferAmount > 0 && (
            <BreakdownRow label={BREAKDOWN_LABELS.reservedBuffer} amount={breakdown.bufferAmount} />
          )}
        </div>
        <div
          className="flex justify-between font-medium pt-2 border-t"
          style={{ borderColor: 'var(--monarch-border)' }}
        >
          <span>Available</span>
          <span style={{ color: statusColor }}>{formattedAmount}</span>
        </div>
      </div>
    ) : null;

  if (mode === 'compact') {
    return (
      <>
        <HoverCard content={tooltipContent} closeDelay={400}>
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded text-sm cursor-help"
            style={{ backgroundColor: 'var(--monarch-bg-card)' }}
          >
            <span style={{ color: 'var(--monarch-text-muted)' }}>Available:</span>
            <span className="font-medium" style={{ color: statusColor }}>
              {formattedAmount}
            </span>
          </div>
        </HoverCard>
        {data && (
          <BreakdownDetailModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            data={data}
            statusColor={statusColor}
            formattedAmount={formattedAmount}
          />
        )}
      </>
    );
  }

  const isPositive = (data?.available ?? 0) >= 0;

  // Header mode - prominent display for page header
  return (
    <>
      <div className="flex items-center gap-3">
        <Icons.Landmark
          size={28}
          style={{ color: 'var(--monarch-text-muted)' }}
          aria-hidden="true"
        />
        <div
          className={`rounded-lg px-4 py-1.5 flex flex-col items-center transition-opacity ${shouldShake ? 'animate-error-shake' : ''}`}
          style={{
            backgroundColor: isPositive ? 'var(--monarch-success-bg)' : 'var(--monarch-error-bg)',
          }}
        >
          <span
            className="text-2xl font-bold leading-tight"
            style={{ color: isPositive ? 'var(--monarch-success)' : 'var(--monarch-error)' }}
          >
            {formattedAmount}
          </span>
          <span
            className="text-xs leading-tight font-medium"
            style={{
              color: isPositive ? 'var(--monarch-success)' : 'var(--monarch-error)',
              opacity: 0.85,
            }}
          >
            Available Funds
          </span>
        </div>
        <HoverCard content={tooltipContent} side="bottom" align="start" closeDelay={400}>
          <Icons.Info
            size={16}
            className="cursor-help"
            style={{ color: 'var(--monarch-text-muted)' }}
          />
        </HoverCard>
      </div>

      {data && (
        <BreakdownDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={data}
          statusColor={statusColor}
          formattedAmount={formattedAmount}
        />
      )}
    </>
  );
}

/**
 * Hook to get available funds data for use in parent components.
 * Useful when parent needs to conditionally render based on the value.
 */
export function useAvailableToStashStatus(options?: {
  includeExpectedIncome?: boolean;
  bufferAmount?: number;
}) {
  const { includeExpectedIncome = false, bufferAmount = 0 } = options ?? {};
  const { data, isLoading, formattedAmount, status, statusColor } = useAvailableToStash({
    includeExpectedIncome,
    bufferAmount,
  });

  return {
    isLoading,
    isOvercommitted: status === 'negative',
    available: data?.available ?? 0,
    formattedAmount,
    status,
    statusColor,
  };
}
