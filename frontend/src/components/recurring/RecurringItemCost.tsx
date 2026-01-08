/**
 * RecurringItemCost - Target display with trend indicators
 *
 * Shows monthly target and frequency text with trend indicators.
 * Supports compact mode for mobile card layout.
 */

import type { RecurringItem } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { formatCurrency, formatFrequencyShort } from '../../utils';
import { TrendUpIcon, TrendDownIcon } from '../icons';

interface RecurringItemCostProps {
  readonly item: RecurringItem;
  readonly compact?: boolean;
}

export function RecurringItemCost({
  item,
  compact = false,
}: RecurringItemCostProps) {
  // Show red indicator when target exceeds current budget (underfunded)
  const showTrendUp = item.frozen_monthly_target > item.planned_budget &&
    (item.is_enabled || item.frozen_monthly_target > 0);
  // Show green indicator when budget exceeds target (overfunded)
  const showTrendDown = item.planned_budget > item.frozen_monthly_target &&
    item.frozen_monthly_target > 0 &&
    (item.is_enabled || item.frozen_monthly_target > 0);

  return (
    <div className={compact ? 'flex flex-col gap-1' : ''}>
      <div className="flex items-center justify-end gap-1">
        {showTrendUp && (
          <Tooltip content={
            item.is_enabled ? (
              <>
                <div className="font-medium">Underfunded</div>
                <div className="text-monarch-text-dark">Budget: {formatCurrency(item.planned_budget, { maximumFractionDigits: 0 })}/mo</div>
                <div className="text-monarch-text-dark">Target: {formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo</div>
                <div className="text-monarch-text-muted text-xs mt-1">
                  Increase budget to stay on track
                </div>
              </>
            ) : (
              <>
                <div className="font-medium">Below Target</div>
                <div className="text-monarch-text-dark">Budget: {formatCurrency(item.planned_budget, { maximumFractionDigits: 0 })}/mo</div>
                <div className="text-monarch-text-dark">Target: {formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo</div>
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
                <div className="font-medium">Overfunded</div>
                <div className="text-monarch-text-dark">Budget: {formatCurrency(item.planned_budget, { maximumFractionDigits: 0 })}/mo</div>
                <div className="text-monarch-text-dark">Target: {formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo</div>
                <div className="text-monarch-text-muted text-xs mt-1">
                  Budgeting more than needed
                </div>
              </>
            ) : (
              <>
                <div className="font-medium">Above Target</div>
                <div className="text-monarch-text-dark">Budget: {formatCurrency(item.planned_budget, { maximumFractionDigits: 0 })}/mo</div>
                <div className="text-monarch-text-dark">Target: {formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo</div>
              </>
            )
          }>
            <span className={item.is_enabled ? 'cursor-pointer hover:opacity-70' : 'cursor-help'} style={{ color: item.is_enabled ? 'var(--monarch-success)' : 'var(--monarch-text-muted)' }}>
              <TrendDownIcon size={12} strokeWidth={2.5} />
            </span>
          </Tooltip>
        )}
        <span className="font-medium text-monarch-text-dark">
          {formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}
        </span>
      </div>
      {item.frequency !== 'monthly' && (
        <div className={`text-xs ${compact ? '' : 'mt-0.5'} text-monarch-text-light text-right`}>
          {formatCurrency(item.amount, { maximumFractionDigits: 0 })}{formatFrequencyShort(item.frequency)}
        </div>
      )}
    </div>
  );
}
