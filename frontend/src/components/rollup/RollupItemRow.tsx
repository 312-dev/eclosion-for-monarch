/**
 * RollupItemRow - Individual item row in the rollup table
 */

import { memo, useState, useCallback } from 'react';
import type { RollupItem } from '../../types';
import { Tooltip } from '../Tooltip';
import { formatCurrency, formatDateRelative } from '../../utils';
import { MerchantIcon, LoadingSpinner } from '../ui';
import { TrendUpIcon, TrendDownIcon, XIcon } from '../icons';

interface RollupItemRowProps {
  readonly item: RollupItem;
  readonly onRemove: () => Promise<void>;
}

export const RollupItemRow = memo(function RollupItemRow({
  item,
  onRemove,
}: RollupItemRowProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const isCatchingUp = item.frozen_monthly_target > item.ideal_monthly_rate;
  const isAhead = item.frozen_monthly_target < item.ideal_monthly_rate && item.frozen_monthly_target > 0;
  const { date, relative } = formatDateRelative(item.next_due_date);

  const handleRemove = useCallback(async () => {
    setIsRemoving(true);
    try {
      await onRemove();
    } finally {
      setIsRemoving(false);
    }
  }, [onRemove]);

  return (
    <tr
      className="group border-t transition-colors"
      style={{ borderColor: 'var(--monarch-border)' }}
    >
      {/* Subscription name with logo */}
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <MerchantIcon logoUrl={item.logo_url} size="sm" />
          <a
            href={`https://app.monarchmoney.com/merchants/${item.merchant_id}?date=${new Date().toISOString().slice(0, 8)}01`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm truncate no-underline"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            {item.name}
          </a>
        </div>
      </td>
      {/* Date column */}
      <td className="py-2 px-3 text-sm">
        <div style={{ color: 'var(--monarch-text-dark)' }}>{date}</div>
        {relative && (
          <div className="text-xs" style={{ color: 'var(--monarch-text-light)' }}>
            {relative}
          </div>
        )}
      </td>
      {/* Amount */}
      <td className="py-2 px-3 text-right text-sm">
        <span style={{ color: 'var(--monarch-text-dark)' }}>{formatCurrency(item.amount, { maximumFractionDigits: 0 })}</span>
      </td>
      {/* Monthly target with catch-up/ahead indicator */}
      <td className="py-2 px-3 text-right text-sm">
        <div className="flex items-center justify-end gap-1">
          {/* Catch-up indicator: red up arrow if frozen target > ideal rate */}
          {isCatchingUp && (
            <Tooltip content={`Catching up: ${formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo -> ${formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo after ${date} payment`}>
              <span className="cursor-help" style={{ color: 'var(--monarch-error)' }}>
                <TrendUpIcon size={10} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
          {/* Ahead indicator: green down arrow if frozen target < ideal rate */}
          {isAhead && (
            <Tooltip content={`Ahead: ${formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo -> ${formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo after ${date} payment`}>
              <span className="cursor-help" style={{ color: 'var(--monarch-success)' }}>
                <TrendDownIcon size={10} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
          <span style={{ color: 'var(--monarch-text-dark)' }}>
            {formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo
          </span>
        </div>
      </td>
      {/* Remove button */}
      <td className="py-2 px-3 text-center">
        <button
          onClick={handleRemove}
          disabled={isRemoving}
          className={`p-1 rounded transition-all disabled:opacity-50 hover-bg-transparent-to-hover ${isRemoving ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          title="Remove from rollup"
        >
          {isRemoving ? (
            <LoadingSpinner size="sm" color="var(--monarch-text-muted)" />
          ) : (
            <XIcon size={16} color="var(--monarch-text-muted)" />
          )}
        </button>
      </td>
    </tr>
  );
});
