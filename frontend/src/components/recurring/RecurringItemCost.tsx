/**
 * RecurringItemCost - Cost display with trend indicators and progress
 *
 * Shows monthly target, frequency text, progress bar, and "to go" amount.
 * Supports compact mode for mobile card layout.
 */

import type { RecurringItem, ItemStatus } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import {
  formatCurrency,
  formatFrequencyShort,
  getStatusStyles,
} from '../../utils';
import { TrendUpIcon, TrendDownIcon } from '../icons';

interface RecurringItemCostProps {
  readonly item: RecurringItem;
  readonly displayStatus: ItemStatus;
  readonly progressPercent: number;
  readonly date: string;
  readonly compact?: boolean;
}

export function RecurringItemCost({
  item,
  displayStatus,
  progressPercent,
  date,
  compact = false,
}: RecurringItemCostProps) {
  const showTrendUp = item.frozen_monthly_target > item.ideal_monthly_rate &&
    (item.is_enabled || item.frozen_monthly_target > 0);
  const showTrendDown = item.frozen_monthly_target < item.ideal_monthly_rate &&
    (item.is_enabled || item.frozen_monthly_target > 0);

  return (
    <div className={compact ? 'flex flex-col gap-1' : ''}>
      <div className={`flex items-center ${compact ? 'justify-start' : 'justify-end'} gap-1`}>
        {showTrendUp && (
          <Tooltip content={
            item.is_enabled ? (
              <>
                <div className="font-medium">Catching Up</div>
                <div className="text-monarch-text-dark">{formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo → {formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo</div>
                <div className="text-monarch-text-muted text-xs mt-1">After {date} payment</div>
              </>
            ) : (
              <>
                <div className="font-medium">Higher Than Usual</div>
                <div className="text-monarch-text-dark">{formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo → {formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo</div>
                <div className="text-monarch-text-muted text-xs mt-1">Extra needed to catch up • After {date}</div>
              </>
            )
          }>
            <span className={item.is_enabled ? 'cursor-pointer hover:opacity-70' : 'cursor-help'} style={{ color: item.is_enabled ? 'var(--monarch-error)' : 'var(--monarch-text-muted)' }}>
              <TrendUpIcon size={12} strokeWidth={2.5} />
            </span>
          </Tooltip>
        )}
        {showTrendDown && (
          <Tooltip content={
            item.is_enabled ? (
              <>
                <div className="font-medium">Ahead of Schedule</div>
                <div className="text-monarch-text-dark">{formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo → {formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo</div>
                <div className="text-monarch-text-muted text-xs mt-1">After {date} payment</div>
              </>
            ) : (
              <>
                <div className="font-medium">Lower Than Usual</div>
                <div className="text-monarch-text-dark">{formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo → {formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo</div>
                <div className="text-monarch-text-muted text-xs mt-1">After {date} payment</div>
              </>
            )
          }>
            <span className={item.is_enabled ? 'cursor-pointer hover:opacity-70' : 'cursor-help'} style={{ color: item.is_enabled ? 'var(--monarch-success)' : 'var(--monarch-text-muted)' }}>
              <TrendDownIcon size={12} strokeWidth={2.5} />
            </span>
          </Tooltip>
        )}
        <span className="font-medium text-monarch-text-dark">
          {formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo
        </span>
      </div>
      <div className={`text-xs ${compact ? '' : 'mt-0.5'} text-monarch-text-light`}>
        {formatCurrency(item.amount, { maximumFractionDigits: 0 })} {formatFrequencyShort(item.frequency)}
      </div>
      {item.is_enabled && (
        <>
          <Tooltip content={
            <>
              <div className="font-medium">
                {item.current_balance - item.contributed_this_month > 0 ? (
                  <>
                    {formatCurrency(item.current_balance - item.contributed_this_month, { maximumFractionDigits: 0 })}
                    <span className="text-monarch-text-muted"> + {formatCurrency(item.contributed_this_month, { maximumFractionDigits: 0 })}</span>
                    {' '}= {formatCurrency(item.current_balance, { maximumFractionDigits: 0 })} of {formatCurrency(item.amount, { maximumFractionDigits: 0 })}
                  </>
                ) : (
                  <>{formatCurrency(item.current_balance, { maximumFractionDigits: 0 })} of {formatCurrency(item.amount, { maximumFractionDigits: 0 })}</>
                )}
              </div>
              <div className="text-monarch-text-muted text-xs mt-1">Resets {formatFrequencyShort(item.frequency)} after payment</div>
            </>
          }>
            <div className={`w-full rounded-full h-1.5 ${compact ? 'mt-2' : 'mt-1.5'} cursor-help bg-monarch-border`}>
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${progressPercent}%`, backgroundColor: getStatusStyles(displayStatus, item.is_enabled).color }}
              />
            </div>
          </Tooltip>
          <div className={`text-xs ${compact ? '' : 'mt-0.5'} text-monarch-text-light`}>
            {formatCurrency(Math.max(0, item.amount - item.current_balance), { maximumFractionDigits: 0 })} to go
          </div>
        </>
      )}
    </div>
  );
}
