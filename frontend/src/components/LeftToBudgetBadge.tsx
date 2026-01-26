/**
 * Left to Budget Badge
 *
 * Display of the "Left to budget" amount.
 * Shows color-coded badge based on positive/negative balance.
 * Shakes briefly when the value transitions to negative to draw attention.
 *
 * Variants:
 * - 'compact': Small badge for inline use
 * - 'sidebar': Larger card for sidebar display (e.g., Recurring page)
 */

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { formatCurrency } from '../utils';
import { Tooltip } from './ui/Tooltip';
import type { ReadyToAssign } from '../types';
import { ExternalLinkIcon, EditIcon } from './icons';
import { UI } from '../constants';
import { useDataMonth, formatMonthShort, formatMonthName } from '../context/MonthTransitionContext';
import { useDistributionMode } from '../context/DistributionModeContext';

interface LeftToBudgetBadgeProps {
  readonly data: ReadyToAssign | null;
  /** Display variant - 'compact' for header, 'sidebar' for recurring page */
  readonly variant?: 'compact' | 'sidebar';
}

/** Shared tooltip content */
const tooltipContent = (
  <>
    Estimate only.
    <br />
    <span className="text-monarch-text-muted">Refer to Monarch for exact amount.</span>
  </>
);

/** Get status color based on positive/negative value */
function getStatusColor(isPositive: boolean): string {
  return isPositive ? 'var(--monarch-success)' : 'var(--monarch-error)';
}

/** Get background color based on positive/negative value */
function getBgColor(isPositive: boolean): string {
  return isPositive ? 'var(--monarch-success-bg)' : 'var(--monarch-error-bg)';
}

/** Hypothesize mode editable badge */
function HypothesizeBadge({
  displayValue,
  rawValue,
  isPositive,
  shouldShake,
  monthLabel,
  onValueChange,
}: {
  displayValue: number;
  rawValue: number;
  isPositive: boolean;
  shouldShake: boolean;
  monthLabel: string;
  onValueChange: (value: number) => void;
}) {
  // Use a rose-red for negative values that complements the purple background
  const hypothesizeColor = isPositive ? '#9333ea' : '#e11d48';

  return (
    <div
      className={`rounded-lg px-3 py-1 flex flex-col items-center ${shouldShake ? 'animate-error-shake' : ''}`}
      style={{ backgroundColor: 'rgba(147, 51, 234, 0.15)' }}
      data-tour="left-to-budget"
    >
      <div className="flex items-center gap-0.5">
        <span className="text-sm font-bold" style={{ color: hypothesizeColor }}>
          $
        </span>
        <input
          type="number"
          value={displayValue ?? rawValue}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const val = Number.parseInt(e.target.value, 10);
            onValueChange(Number.isNaN(val) ? 0 : val);
          }}
          className="w-16 text-base font-bold leading-tight bg-transparent outline-none text-center"
          style={{
            color: hypothesizeColor,
            borderBottom: `1px solid ${hypothesizeColor}`,
          }}
          aria-label="Custom left to budget amount"
        />
        <EditIcon size={10} style={{ color: hypothesizeColor, opacity: 0.6 }} />
      </div>
      <span
        className="text-[10px] leading-tight"
        style={{ color: hypothesizeColor, opacity: 0.85 }}
      >
        Left to budget in {monthLabel}
      </span>
    </div>
  );
}

/** Sidebar variant - larger card for recurring page */
function SidebarBadge({
  displayValue,
  isPositive,
  shouldShake,
  monthLabel,
}: {
  displayValue: number;
  isPositive: boolean;
  shouldShake: boolean;
  monthLabel: string;
}) {
  const statusColor = getStatusColor(isPositive);

  return (
    <Tooltip content={tooltipContent}>
      <a
        href="https://app.monarch.com/plan"
        target="_blank"
        rel="noopener noreferrer"
        className={`block rounded-xl px-4 py-4 text-center hover:opacity-80 transition-opacity mb-3 ${shouldShake ? 'animate-error-shake' : ''}`}
        style={{ backgroundColor: getBgColor(isPositive) }}
        data-tour="left-to-budget"
      >
        <div className="text-2xl font-bold mb-1" style={{ color: statusColor }}>
          {formatCurrency(displayValue, { maximumFractionDigits: 0 })}
        </div>
        <div
          className="text-sm flex items-center justify-center gap-1"
          style={{ color: statusColor, opacity: 0.85 }}
        >
          Left to budget in {monthLabel}
          <ExternalLinkIcon size={12} strokeWidth={2.5} />
        </div>
      </a>
    </Tooltip>
  );
}

/** Compact variant - small badge for inline use */
function CompactBadge({
  displayValue,
  isPositive,
  shouldShake,
  monthLabel,
}: {
  displayValue: number;
  isPositive: boolean;
  shouldShake: boolean;
  monthLabel: string;
}) {
  const statusColor = getStatusColor(isPositive);

  return (
    <Tooltip content={tooltipContent}>
      <a
        href="https://app.monarch.com/plan"
        target="_blank"
        rel="noopener noreferrer"
        className={`rounded-lg px-4 py-1 flex flex-col items-center hover:opacity-80 transition-opacity ${shouldShake ? 'animate-error-shake' : ''}`}
        style={{ backgroundColor: getBgColor(isPositive) }}
        data-tour="left-to-budget"
      >
        <span className="text-base font-bold leading-tight" style={{ color: statusColor }}>
          {formatCurrency(displayValue, { maximumFractionDigits: 0 })}
        </span>
        <span
          className="text-[10px] leading-tight flex items-center gap-0.5"
          style={{ color: statusColor, opacity: 0.85 }}
        >
          Left to budget in {monthLabel}
          <ExternalLinkIcon size={8} strokeWidth={2.5} />
        </span>
      </a>
    </Tooltip>
  );
}

export function LeftToBudgetBadge({ data, variant = 'compact' }: LeftToBudgetBadgeProps) {
  const [shouldShake, setShouldShake] = useState(false);
  const prevValueRef = useRef<number | null>(null);
  const dataMonth = useDataMonth();
  const monthLabel =
    variant === 'sidebar' ? formatMonthName(dataMonth) : formatMonthShort(dataMonth);
  const { mode, customLeftToBudget, setCustomLeftToBudget } = useDistributionMode();
  const isHypothesizeMode = mode === 'hypothesize';

  // Use custom value in hypothesize mode, otherwise use data value
  const displayValue =
    isHypothesizeMode && customLeftToBudget !== null
      ? customLeftToBudget
      : (data?.ready_to_assign ?? 0);
  const isPositive = displayValue >= 0;

  useEffect(() => {
    if (!data) return;

    const prevValue = prevValueRef.current;
    const currentValue = data.ready_to_assign;

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

  if (!data) return null;

  if (isHypothesizeMode) {
    return (
      <HypothesizeBadge
        displayValue={customLeftToBudget ?? data.ready_to_assign}
        rawValue={data.ready_to_assign}
        isPositive={isPositive}
        shouldShake={shouldShake}
        monthLabel={monthLabel}
        onValueChange={setCustomLeftToBudget}
      />
    );
  }

  if (variant === 'sidebar') {
    return (
      <SidebarBadge
        displayValue={displayValue}
        isPositive={isPositive}
        shouldShake={shouldShake}
        monthLabel={monthLabel}
      />
    );
  }

  return (
    <CompactBadge
      displayValue={displayValue}
      isPositive={isPositive}
      shouldShake={shouldShake}
      monthLabel={monthLabel}
    />
  );
}
