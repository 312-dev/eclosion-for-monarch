/**
 * Rollup Item Row
 *
 * Individual row component for items in the rollup table.
 */

import { memo, useState, useCallback } from 'react';
import type { RollupItem } from '../../types';
import { Tooltip } from '../ui/Tooltip';
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
    <tr className="group border-t border-monarch-border transition-colors">
      {/* Subscription name with logo */}
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <MerchantIcon logoUrl={item.logo_url} itemName={item.name} size="sm" />
          <a
            href={`https://app.monarchmoney.com/merchants/${item.merchant_id}?date=${new Date().toISOString().slice(0, 8)}01`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm truncate no-underline text-monarch-text-dark"
          >
            {item.name}
          </a>
        </div>
      </td>
      {/* Date column */}
      <td className="py-2 px-3 text-sm">
        <div className="text-monarch-text-dark">{date}</div>
        {relative && (
          <div className="text-xs text-monarch-text-light">
            {relative}
          </div>
        )}
      </td>
      {/* Amount */}
      <td className="py-2 px-3 text-right text-sm">
        <span className="text-monarch-text-dark">{formatCurrency(item.amount, { maximumFractionDigits: 0 })}</span>
      </td>
      {/* Monthly target with catch-up/ahead indicator */}
      <td className="py-2 px-3 text-right text-sm">
        <div className="flex items-center justify-end gap-1">
          {isCatchingUp && (
            <Tooltip content={
              <>
                <div className="font-medium">Catching Up</div>
                <div className="text-monarch-text-dark">{formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo → {formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo</div>
                <div className="text-monarch-text-muted text-xs mt-1">After {date} payment</div>
              </>
            }>
              <span className="cursor-help text-monarch-error">
                <TrendUpIcon size={10} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
          {isAhead && (
            <Tooltip content={
              <>
                <div className="font-medium">Ahead of Schedule</div>
                <div className="text-monarch-text-dark">{formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo → {formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo</div>
                <div className="text-monarch-text-muted text-xs mt-1">After {date} payment</div>
              </>
            }>
              <span className="cursor-help text-monarch-success">
                <TrendDownIcon size={10} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
          <span className="text-monarch-text-dark">
            {formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo
          </span>
        </div>
      </td>
      {/* Remove button */}
      <td className="py-2 px-3 text-center">
        <button
          type="button"
          onClick={handleRemove}
          disabled={isRemoving}
          aria-label={`Remove ${item.name} from rollup`}
          aria-busy={isRemoving}
          className={`p-1 rounded transition-all disabled:opacity-50 hover-bg-transparent-to-hover ${isRemoving ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
        >
          {isRemoving ? (
            <LoadingSpinner size="sm" color="var(--monarch-text-muted)" />
          ) : (
            <XIcon size={16} color="var(--monarch-text-muted)" aria-hidden="true" />
          )}
        </button>
      </td>
    </tr>
  );
});
