/**
 * Rollup Item Row
 *
 * Individual row component for items in the rollup table.
 */

import { memo, useState, useCallback } from 'react';
import type { RollupItem } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import {
  formatCurrency,
  formatDateRelative,
  formatFrequencyShort,
  decodeHtmlEntities,
  getNormalizationDate,
} from '../../utils';
import { getCurrentMonthKey } from '../../utils/dateRangeUtils';
import { MerchantIcon } from '../ui';
import { TrendUpIcon, TrendDownIcon, AnchorIcon, BlockedIcon, SpinnerIcon } from '../icons';
import { useIsRateLimited } from '../../context/RateLimitContext';

interface RollupItemRowProps {
  readonly item: RollupItem;
  readonly onRemove: () => Promise<void>;
  /** Optional data-tour attribute for guided tour targeting */
  readonly dataTourId?: string;
}

export const RollupItemRow = memo(function RollupItemRow({
  item,
  onRemove,
  dataTourId,
}: RollupItemRowProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const isRateLimited = useIsRateLimited();
  const isDisabled = isRemoving || isRateLimited;
  const target = Math.round(item.frozen_monthly_target);
  const idealRate = Math.round(item.ideal_monthly_rate);
  const isCatchingUp = target > idealRate && idealRate > 0;
  const isAhead = target < idealRate && target > 0;
  const isStable = target === idealRate && target > 0;
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
    <tr className="group border-t border-monarch-border transition-colors" data-tour={dataTourId}>
      {/* Subscription name with logo */}
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <Tooltip content="Remove from rollup">
            <button
              onClick={handleRemove}
              disabled={isDisabled}
              aria-label={`Remove ${decodeHtmlEntities(item.name)} from rollup`}
              className="group/avatar relative shrink-0 w-6 h-6 rounded-full cursor-pointer disabled:opacity-50"
            >
              <div className="group-hover/avatar:opacity-30 transition-opacity">
                <MerchantIcon logoUrl={item.logo_url} itemName={item.name} size="sm" />
              </div>
              {isRemoving ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <SpinnerIcon size={14} color="var(--monarch-orange)" strokeWidth={2} />
                </div>
              ) : (
                <div className="absolute inset-0 hidden group-hover/avatar:flex items-center justify-center">
                  <BlockedIcon size={14} color="var(--monarch-text-muted)" strokeWidth={2} />
                </div>
              )}
            </button>
          </Tooltip>
          <a
            href={`https://app.monarch.com/merchants/${item.merchant_id}?date=${getCurrentMonthKey()}-01`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm truncate no-underline text-monarch-text-dark"
          >
            {decodeHtmlEntities(item.name)}
          </a>
        </div>
      </td>
      {/* Date column */}
      <td className="py-2 px-3 text-sm">
        <div className="text-monarch-text-dark">{date}</div>
        {relative && <div className="text-xs text-monarch-text-light">{relative}</div>}
      </td>
      {/* Amount */}
      <td className="py-2 px-3 text-right text-sm">
        <div className="flex flex-col items-end">
          <span className="text-monarch-text-dark">
            {formatCurrency(item.amount, { maximumFractionDigits: 0 })}
          </span>
          {item.frequency !== 'monthly' && (
            <div className="text-xs text-monarch-text-light mt-0.5">
              {formatFrequencyShort(item.frequency)}
            </div>
          )}
        </div>
      </td>
      {/* Monthly target with catch-up/ahead/stable indicator */}
      <td className="py-2 px-3 text-right text-sm">
        <div className="flex items-center justify-end gap-1">
          <span className="text-monarch-text-dark">
            {formatCurrency(target, { maximumFractionDigits: 0 })}/mo
          </span>
          {isCatchingUp && (
            <Tooltip
              content={
                <>
                  <div className="font-medium flex items-center gap-1">
                    <TrendUpIcon size={12} strokeWidth={2.5} className="text-monarch-error" />{' '}
                    Catching Up
                  </div>
                  <div>
                    <span className="text-monarch-orange">
                      {formatCurrency(target, { maximumFractionDigits: 0 })}/mo
                    </span>
                    <span className="text-monarch-text-muted"> → </span>
                    <span className="text-monarch-success">
                      {formatCurrency(idealRate, { maximumFractionDigits: 0 })}/mo
                    </span>
                  </div>
                  <div className="text-monarch-text-muted text-xs mt-1">
                    {item.frequency_months < 1
                      ? 'Normalizes as buffer builds'
                      : `Normalizes ${getNormalizationDate(item.next_due_date)}`}
                  </div>
                </>
              }
            >
              <span className="cursor-help text-monarch-error">
                <TrendUpIcon size={10} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
          {isAhead && (
            <Tooltip
              content={
                <>
                  <div className="font-medium flex items-center gap-1">
                    <TrendDownIcon size={12} strokeWidth={2.5} className="text-monarch-success" />{' '}
                    Ahead of Schedule
                  </div>
                  <div>
                    <span className="text-monarch-success">
                      {formatCurrency(target, { maximumFractionDigits: 0 })}/mo
                    </span>
                    <span className="text-monarch-text-muted"> → </span>
                    <span className="text-monarch-orange">
                      {formatCurrency(idealRate, { maximumFractionDigits: 0 })}/mo
                    </span>
                  </div>
                  <div className="text-monarch-text-muted text-xs mt-1">
                    {item.frequency_months < 1
                      ? 'Normalizes as buffer depletes'
                      : `Normalizes ${getNormalizationDate(item.next_due_date)}`}
                  </div>
                </>
              }
            >
              <span className="cursor-help text-monarch-success">
                <TrendDownIcon size={10} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
          {isStable && (
            <Tooltip
              content={
                <>
                  <div className="font-medium flex items-center gap-1">
                    <AnchorIcon size={12} strokeWidth={2.5} className="text-monarch-text-muted" />{' '}
                    Stable Target
                  </div>
                  <div className="text-monarch-text-muted text-xs">
                    This is the stable monthly target for this subscription
                  </div>
                </>
              }
            >
              <span className="cursor-help text-monarch-text-muted">
                <AnchorIcon size={10} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
        </div>
      </td>
    </tr>
  );
});
