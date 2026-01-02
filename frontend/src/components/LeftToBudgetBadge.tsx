/**
 * Left to Budget Badge
 *
 * Compact display of the "Left to budget" amount for use in the app header.
 * Shows color-coded badge based on positive/negative balance.
 */

import { formatCurrency } from '../utils';
import { Tooltip } from './ui/Tooltip';
import type { ReadyToAssign } from '../types';
import { ExternalLinkIcon } from './icons';

interface LeftToBudgetBadgeProps {
  data: ReadyToAssign | null;
}

export function LeftToBudgetBadge({ data }: LeftToBudgetBadgeProps) {
  if (!data) return null;

  const isPositive = data.ready_to_assign >= 0;

  return (
    <Tooltip content={<>Estimate only.<br /><span className="text-zinc-400">Refer to Monarch for exact amount.</span></>}>
      <a
        href="https://app.monarch.com/plan"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg px-4 py-1 flex flex-col items-center hover:opacity-80 transition-opacity"
        style={{ backgroundColor: isPositive ? 'var(--monarch-success-bg)' : 'var(--monarch-error-bg)' }}
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
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </span>
      </a>
    </Tooltip>
  );
}
