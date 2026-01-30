/**
 * Shared Breakdown Components
 *
 * Reusable components for displaying the Available Funds breakdown.
 * Used by both the tooltip (AvailableFundsBar) and modal (BreakdownDetailModal).
 */

import { Icons } from '../icons';
import { HoverCard } from '../ui/HoverCard';
import { formatAvailableAmount } from '../../utils/availableToStash';
import type { BreakdownLineItem } from '../../types';

/**
 * Shared labels for breakdown display.
 * Single source of truth for tooltip and modal.
 */
export const BREAKDOWN_LABELS = {
  cashOnHand: 'Cash on hand',
  goalBalances: 'Remaining goal funds',
  expectedIncome: 'Expected income',
  creditCardDebt: 'Credit card debt',
  unspentBudgets: 'Unspent budgets',
  stashBalances: 'Stash balances',
  leftToBudget: 'Left to budget',
  reservedBuffer: 'Reserved buffer',
} as const;

export const BREAKDOWN_EMPTY_MESSAGES = {
  cashOnHand: 'No cash accounts',
  goalBalances: 'No active goals',
  creditCardDebt: 'No credit card balances',
  unspentBudgets: 'All budgets fully spent',
  stashBalances: 'No stash balances',
} as const;

// ============================================================================
// Tooltip Components
// ============================================================================

interface BreakdownRowProps {
  readonly label: string;
  readonly amount: number;
  readonly isPositive?: boolean;
  readonly items?: BreakdownLineItem[];
  readonly onExpand?: () => void;
  /** Running total after this line item (shown in muted text) */
  readonly runningTotal?: number;
}

/**
 * A single row in the breakdown tooltip with optional nested tooltip showing items.
 * Numbers with details have a dotted underline to indicate hover-ability.
 */
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

interface ExpectedIncomeRowProps {
  readonly amount: number;
  readonly isEnabled: boolean;
  readonly onToggle: () => void;
  /** Running total after this line item (shown in muted text) */
  readonly runningTotal?: number;
}

/**
 * Expected income row with a checkbox to toggle inclusion.
 */
export function ExpectedIncomeRow({
  amount,
  isEnabled,
  onToggle,
  runningTotal,
}: ExpectedIncomeRowProps) {
  const color = isEnabled ? 'var(--monarch-green)' : 'var(--monarch-text-muted)';
  const sign = isEnabled ? '+' : '';

  return (
    <div className="flex justify-between items-center gap-2">
      <label className="flex items-center gap-1.5 cursor-pointer flex-1">
        <span style={{ color: 'var(--monarch-text-muted)' }}>
          {BREAKDOWN_LABELS.expectedIncome}
        </span>
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={() => {}}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="w-3.5 h-3.5 rounded border cursor-pointer"
          style={{
            borderColor: 'var(--monarch-border)',
            accentColor: isEnabled ? 'var(--monarch-green)' : undefined,
          }}
          aria-label="Include expected income in calculation"
        />
      </label>
      <span
        className="tabular-nums text-right"
        style={{
          color,
          opacity: isEnabled ? 1 : 0.5,
          textDecoration: isEnabled ? 'none' : 'line-through',
          minWidth: '4.5rem',
        }}
      >
        {sign}
        {formatAvailableAmount(amount)}
      </span>
      {runningTotal !== undefined && (
        <span
          className="tabular-nums text-right"
          style={{
            color: 'var(--monarch-text-muted)',
            minWidth: '4.5rem',
            opacity: isEnabled ? 0.7 : 0.4,
            textDecoration: isEnabled ? 'none' : 'line-through',
          }}
        >
          {formatAvailableAmount(runningTotal)}
        </span>
      )}
    </div>
  );
}

// Re-export LeftToBudgetRow from its own module for backwards compatibility
export { LeftToBudgetRow } from './LeftToBudgetRow';

// ============================================================================
// Modal Components
// ============================================================================

interface BreakdownSectionProps {
  readonly title: string;
  readonly items: { id: string; name: string; amount: number }[];
  readonly total: number;
  readonly isPositive?: boolean;
  readonly emptyMessage?: string;
}

/**
 * A full section in the breakdown modal with scrollable item list.
 */
export function BreakdownSection({
  title,
  items,
  total,
  isPositive = false,
  emptyMessage = 'None',
}: BreakdownSectionProps) {
  const color = isPositive ? 'var(--monarch-green)' : 'var(--monarch-red)';
  const sign = isPositive ? '+' : '-';

  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: 'var(--monarch-bg-page)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
          {title}
        </h3>
        <span className="text-sm font-medium" style={{ color }}>
          {sign}
          {formatAvailableAmount(total)}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          {emptyMessage}
        </p>
      ) : (
        <div
          className="max-h-48 overflow-y-auto space-y-1 pr-2"
          style={{ scrollbarGutter: 'stable' }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-(--monarch-bg-hover)"
            >
              <span
                className="text-sm truncate flex-1 mr-4"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                {item.name}
              </span>
              <span className="text-sm tabular-nums" style={{ color }}>
                {sign}
                {formatAvailableAmount(item.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
