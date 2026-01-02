import { memo } from 'react';
import type { RecurringItem } from '../types';
import { formatCurrency as formatCurrencyBase, formatDate, getStatusLabel, getStatusStylesExtended } from '../utils';

interface CategoryCardProps {
  item: RecurringItem;
}

/** Format currency with no decimals for compact display */
const formatCurrency = (amount: number) =>
  formatCurrencyBase(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const CategoryCard = memo(function CategoryCard({ item }: CategoryCardProps) {
  const statusStyles = getStatusStylesExtended(item.status);
  const statusLabel = getStatusLabel(item.status);
  const isInactive = item.status === 'inactive';

  return (
    <div
      className={`rounded-lg shadow p-4 bg-monarch-bg-card ${isInactive ? 'opacity-60' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium text-monarch-text-dark">
            {item.name}
          </h3>
          <p className="text-sm text-monarch-text-muted">
            {formatDate(item.next_due_date)} ({item.frequency_months}mo cycle)
          </p>
        </div>
        <span
          className="px-2 py-1 text-xs font-medium rounded-full"
          style={{ backgroundColor: statusStyles.bg, color: statusStyles.color }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-monarch-text-muted">
            {formatCurrency(item.current_balance)} of{' '}
            {formatCurrency(item.amount)}
          </span>
          <span className="font-medium text-monarch-text-dark">
            {item.progress_percent.toFixed(0)}%
          </span>
        </div>
        <div className="rounded-full h-2 bg-monarch-border">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              backgroundColor: statusStyles.progressColor,
              width: `${Math.min(100, item.progress_percent)}%`,
            }}
          />
        </div>
      </div>

      <div className="flex justify-between text-sm">
        <div>
          <span className="text-monarch-text-muted">Monthly: </span>
          <span className="font-medium text-monarch-text-dark">
            {formatCurrency(item.frozen_monthly_target)}
          </span>
        </div>
        <div>
          <span className="text-monarch-text-muted">
            {item.months_until_due} month{item.months_until_due !== 1 ? 's' : ''}{' '}
            left
          </span>
        </div>
      </div>

      {item.over_contribution > 0 && (
        <div className="mt-2 text-xs text-monarch-info">
          +{formatCurrency(item.over_contribution)} over-contributed
        </div>
      )}
    </div>
  );
});
