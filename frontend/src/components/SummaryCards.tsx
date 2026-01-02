import type { DashboardSummary, RecurringItem } from '../types';
import { formatCurrency } from '../utils';
import { TrendDownIcon } from './icons';

interface SummaryCardsProps {
  summary: DashboardSummary;
  items: RecurringItem[];
}

function getLowestMonthlyDate(items: RecurringItem[]): string | null {
  // Find the latest due date among enabled items that aren't fully funded
  // That's when all items will have reset and we'll be at the baseline rate
  const enabledItems = items.filter(i => i.is_enabled && i.progress_percent < 100);

  const firstItem = enabledItems[0];
  if (!firstItem) {
    return null;
  }

  // Find the furthest due date - that's when we'll reach lowest monthly cost
  const latestDate = enabledItems.reduce((latest, item) => {
    const itemDate = new Date(item.next_due_date);
    return itemDate > latest ? itemDate : latest;
  }, new Date(firstItem.next_due_date));

  return latestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SummaryCards({ summary, items }: SummaryCardsProps) {
  // Current monthly = what we're saving now (higher due to catch-up)
  const currentMonthlyCost = summary.total_monthly_contribution;

  // Lowest monthly = sum of ideal rates (baseline once caught up)
  const lowestMonthlyCost = items
    .filter(i => i.is_enabled)
    .reduce((sum, item) => sum + item.ideal_monthly_rate, 0);

  const lowestDate = getLowestMonthlyDate(items);
  const showAnticipatedLower = lowestMonthlyCost < currentMonthlyCost && lowestDate;

  return (
    <div
      className="rounded-xl mb-6 px-6 py-4 flex items-center justify-between"
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: 'var(--monarch-bg-hover)'
      }}
    >
      <div>
        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>Recurring</div>
        <div className="text-lg font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>Summary</div>
      </div>

      <div className="text-right">
        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>Current Monthly</div>
        <div className="text-lg font-semibold" style={{ color: 'var(--monarch-orange)' }}>
          {formatCurrency(currentMonthlyCost, { maximumFractionDigits: 0 })}
        </div>
        {showAnticipatedLower && (
          <div className="text-xs flex items-center justify-end gap-1" style={{ color: 'var(--monarch-success)' }}>
            <TrendDownIcon size={12} />
            {formatCurrency(lowestMonthlyCost, { maximumFractionDigits: 0 })} beg. {lowestDate}
          </div>
        )}
      </div>
    </div>
  );
}
