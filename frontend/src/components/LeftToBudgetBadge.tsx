/**
 * Left to Budget Badge
 *
 * Compact display of the "Left to budget" amount for use in the app header.
 * Shows color-coded badge based on positive/negative balance.
 * Shakes briefly when the value transitions to negative to draw attention.
 */

import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '../utils';
import { Tooltip } from './ui/Tooltip';
import type { ReadyToAssign } from '../types';
import { ExternalLinkIcon } from './icons';
import { UI } from '../constants';

interface LeftToBudgetBadgeProps {
  data: ReadyToAssign | null;
}

export function LeftToBudgetBadge({ data }: LeftToBudgetBadgeProps) {
  const [shouldShake, setShouldShake] = useState(false);
  const prevValueRef = useRef<number | null>(null);

  const isPositive = data ? data.ready_to_assign >= 0 : true;

  useEffect(() => {
    if (!data) return;

    const prevValue = prevValueRef.current;
    const currentValue = data.ready_to_assign;

    // Update ref first
    prevValueRef.current = currentValue;

    // Trigger shake when transitioning from positive (or null) to negative
    if (currentValue < 0 && (prevValue === null || prevValue >= 0)) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
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

  return (
    <Tooltip content={<>Estimate only.<br /><span className="text-monarch-text-muted">Refer to Monarch for exact amount.</span></>}>
      <a
        href="https://app.monarch.com/plan"
        target="_blank"
        rel="noopener noreferrer"
        className={`rounded-lg px-4 py-1 flex flex-col items-center hover:opacity-80 transition-opacity ${shouldShake ? 'animate-error-shake' : ''}`}
        style={{ backgroundColor: isPositive ? 'var(--monarch-success-bg)' : 'var(--monarch-error-bg)' }}
        data-tour="left-to-budget"
      >
        <span
          className="text-base font-bold leading-tight"
          style={{ color: isPositive ? 'var(--monarch-success)' : 'var(--monarch-error)' }}
        >
          {formatCurrency(data.ready_to_assign, { maximumFractionDigits: 0 })}
        </span>
        <span
          className="text-[10px] leading-tight flex items-center gap-0.5"
          style={{ color: isPositive ? 'var(--monarch-success)' : 'var(--monarch-error)', opacity: 0.85 }}
        >
          Left to budget in {new Date().toLocaleDateString('en-US', { month: 'short' })}
          <ExternalLinkIcon size={8} strokeWidth={2.5} />
        </span>
      </a>
    </Tooltip>
  );
}
