/**
 * BreakdownRow
 *
 * A single row in the Available Funds breakdown tooltip.
 * Shows a label and amount, with optional nested hover card for line items.
 */

import { Icons } from '../icons';
import { HoverCard } from '../ui/HoverCard';
import { formatAvailableAmount } from '../../utils/availableToStash';
import type { BreakdownLineItem } from '../../types';

interface BreakdownRowProps {
  readonly label: string;
  readonly amount: number;
  readonly isPositive?: boolean;
  readonly items?: BreakdownLineItem[];
  readonly onExpand?: () => void;
  /** Running total after this line item (shown in muted text) */
  readonly runningTotal?: number;
}

export function BreakdownRow({
  label,
  amount,
  isPositive = false,
  items,
  onExpand,
  runningTotal,
}: BreakdownRowProps) {
  const color = isPositive ? 'var(--monarch-green)' : 'var(--monarch-red)';
  const sign = isPositive ? '+' : '-';
  const hasItems = items && items.length > 0;

  const amountDisplay = (
    <span
      className={hasItems ? 'cursor-help' : ''}
      style={{
        color,
        borderBottom: hasItems
          ? `1px dashed color-mix(in srgb, ${color} 40%, transparent)`
          : 'none',
        paddingBottom: hasItems ? '2px' : undefined,
      }}
    >
      {sign}
      {formatAvailableAmount(amount)}
    </span>
  );

  const nestedTooltipContent = hasItems ? (
    <div className="text-xs max-w-64">
      <div
        className="flex items-center justify-between font-medium pb-1 mb-1 border-b"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        <span>{label}</span>
        {onExpand && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="p-0.5 rounded hover:bg-(--monarch-bg-hover)"
            style={{ color: 'var(--monarch-text-muted)' }}
            aria-label={`Expand ${label} details`}
          >
            <Icons.Maximize2 size={10} />
          </button>
        )}
      </div>
      <div
        className="max-h-40 overflow-y-auto space-y-0.5 pr-1"
        style={{ scrollbarGutter: 'stable' }}
      >
        {items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4">
            <span className="truncate" style={{ color: 'var(--monarch-text-muted)' }}>
              {item.name}
            </span>
            <span className="tabular-nums shrink-0" style={{ color }}>
              {sign}
              {formatAvailableAmount(item.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div className="flex justify-between items-center gap-2">
      <span className="flex-1" style={{ color: 'var(--monarch-text-muted)' }}>
        {label}
      </span>
      <span className="tabular-nums text-right" style={{ minWidth: '4.5rem' }}>
        {hasItems ? (
          <HoverCard content={nestedTooltipContent} side="right" closeDelay={400}>
            {amountDisplay}
          </HoverCard>
        ) : (
          amountDisplay
        )}
      </span>
      {runningTotal !== undefined && (
        <span
          className="tabular-nums text-right"
          style={{ color: 'var(--monarch-text-muted)', minWidth: '4.5rem', opacity: 0.7 }}
        >
          {formatAvailableAmount(runningTotal)}
        </span>
      )}
    </div>
  );
}
