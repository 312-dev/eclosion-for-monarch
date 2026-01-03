/**
 * ReadyToAssign - Sidebar component showing budget status and monthly savings
 *
 * Accessibility features:
 * - aria-label on interactive elements
 * - aria-describedby for progress bars
 * - Keyboard accessible popover with Escape to close
 * - Proper focus management
 */

import { useMemo, useId, useCallback } from 'react';
import type { ReadyToAssign as ReadyToAssignData, RecurringItem, DashboardSummary, RollupData } from '../types';
import { Portal } from './Portal';
import { formatCurrency } from '../utils';
import { Tooltip } from './ui/Tooltip';
import { useDropdown } from '../hooks';

// Re-export chart components for backward compatibility
export { BurndownChart, calculateBurndownData } from './charts';
export type { BurndownPoint } from './charts';

interface ReadyToAssignProps {
  data: ReadyToAssignData;
  summary: DashboardSummary;
  items: RecurringItem[];
  rollup: RollupData;
  variant?: 'mobile' | 'sidebar';
}

function getLowestMonthlyDate(items: RecurringItem[]): string | null {
  const enabledItems = items.filter(i => i.is_enabled && i.progress_percent < 100);
  const firstEnabledItem = enabledItems[0];
  if (!firstEnabledItem) return null;

  const latestDate = enabledItems.reduce((latest, item) => {
    const itemDate = new Date(item.next_due_date);
    return itemDate > latest ? itemDate : latest;
  }, new Date(firstEnabledItem.next_due_date));

  // Costs lower the month after the last catch-up payment
  const startingMonth = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 1);
  const month = startingMonth.toLocaleDateString('en-US', { month: 'short' });
  const year = startingMonth.toLocaleDateString('en-US', { year: '2-digit' });
  return `${month} '${year}`;
}

export function ReadyToAssign({ data, summary, items, rollup, variant = 'sidebar' }: ReadyToAssignProps) {
  const progressBarId = useId();
  const popoverId = useId();

  const infoDropdown = useDropdown<HTMLDivElement, HTMLButtonElement>({
    alignment: 'right',
    offset: { y: 8 },
  });

  // Handle Escape key to close popover
  const handlePopoverKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      infoDropdown.close();
      infoDropdown.triggerRef.current?.focus();
    }
  }, [infoDropdown]);

  const isPositive = data.ready_to_assign >= 0;
  const currentMonthlyCost = summary.total_monthly_contribution;
  const lowestMonthlyCost = items
    .filter(i => i.is_enabled)
    .reduce((sum, item) => sum + item.ideal_monthly_rate, 0);
  const lowestDate = getLowestMonthlyDate(items);
  const showAnticipatedLower = lowestMonthlyCost < currentMonthlyCost && lowestDate;

  const catchUpAmount = currentMonthlyCost - Math.round(lowestMonthlyCost);
  const itemsBehind = items.filter(i => i.is_enabled && i.progress_percent < 100);

  // Calculate dedicated categories totals (non-rollup items)
  const dedicatedCategories = useMemo(() => {
    const dedicatedItems = items.filter(i => i.is_enabled && !i.is_in_rollup);
    return {
      target: dedicatedItems.reduce((sum, item) => sum + item.amount, 0),
      saved: dedicatedItems.reduce((sum, item) => sum + item.current_balance, 0),
    };
  }, [items]);

  // Calculate untracked (disabled) recurring total
  const untrackedCategories = useMemo(() => {
    const disabledItems = items.filter(i => !i.is_enabled);
    return {
      total: disabledItems.reduce((sum, item) => sum + item.amount, 0),
    };
  }, [items]);

  // Mobile horizontal layout
  if (variant === 'mobile') {
    return (
      <div className="px-4 py-3 flex items-center justify-between gap-3 bg-monarch-bg-card border-b border-monarch-border">
        {/* Left to Budget */}
        <a
          href="https://app.monarch.com/plan"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${formatCurrency(data.ready_to_assign, { maximumFractionDigits: 0 })} left to budget. Opens Monarch budget in new tab`}
          className={`rounded-lg px-3 py-2 flex flex-col items-center shrink-0 hover:opacity-80 transition-opacity ${isPositive ? 'bg-monarch-success-bg' : 'bg-monarch-error-bg'}`}
        >
          <div className={`text-lg font-bold ${isPositive ? 'text-monarch-success' : 'text-monarch-error'}`}>
            {formatCurrency(data.ready_to_assign, { maximumFractionDigits: 0 })}
          </div>
          <div className={`text-xs flex items-center gap-0.5 ${isPositive ? 'text-monarch-success' : 'text-monarch-error'}`}>
            Left to budget
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </div>
        </a>

        {/* Current Monthly */}
        <div className="text-center shrink-0">
          <div className="text-xs text-monarch-text-muted">Monthly</div>
          <div className="text-base font-semibold text-monarch-orange">
            {formatCurrency(currentMonthlyCost, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
    );
  }

  // Sidebar vertical layout
  return (
    <div className="stats-sidebar-content">
      {/* Current Monthly */}
      <div className="rounded-xl px-4 pt-4 pb-6 text-center bg-monarch-orange-light">
        <div className="flex items-center justify-center gap-1.5 text-2xl font-bold mb-1 text-monarch-orange">
          <span>{formatCurrency(currentMonthlyCost, { maximumFractionDigits: 0 })}</span>
          {untrackedCategories.total > 0 && (
            <Tooltip content={
              <>
                <div className="font-medium">Excludes Untracked</div>
                <div className="text-zinc-400 text-xs mt-1">{formatCurrency(untrackedCategories.total, { maximumFractionDigits: 0 })} in categories not linked to recurring items</div>
              </>
            }>
              <span className="cursor-help text-monarch-warning">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </span>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center justify-center gap-1.5 text-sm text-monarch-text-dark">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Current Monthly</span>
        </div>
        {/* Progress bar showing total saved vs current monthly */}
        {currentMonthlyCost > 0 && (
          <div className="mt-3">
            <div
              role="progressbar"
              aria-valuenow={Math.round((dedicatedCategories.saved + rollup.total_saved) / currentMonthlyCost * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Monthly savings progress: ${formatCurrency(dedicatedCategories.saved + rollup.total_saved, { maximumFractionDigits: 0 })} of ${formatCurrency(currentMonthlyCost, { maximumFractionDigits: 0 })} saved`}
              aria-describedby={progressBarId}
              className="h-2 rounded-full overflow-hidden bg-monarch-orange/20"
            >
              <div
                className="h-full rounded-full transition-all bg-monarch-orange"
                style={{
                  width: `${Math.min(100, ((dedicatedCategories.saved + rollup.total_saved) / currentMonthlyCost) * 100)}%`,
                }}
              />
            </div>
            <div id={progressBarId} className="flex justify-between mt-1 text-xs text-monarch-text-dark">
              <span>{formatCurrency(dedicatedCategories.saved + rollup.total_saved, { maximumFractionDigits: 0 })} saved</span>
              <span>{formatCurrency(Math.max(0, currentMonthlyCost - dedicatedCategories.saved - rollup.total_saved), { maximumFractionDigits: 0 })} to go</span>
            </div>
          </div>
        )}
        {showAnticipatedLower && (
          <button
            // eslint-disable-next-line react-hooks/refs -- passing ref object to ref prop is correct
            ref={infoDropdown.triggerRef}
            type="button"
            aria-label={`View details: Monthly cost decreases to ${formatCurrency(Math.round(lowestMonthlyCost), { maximumFractionDigits: 0 })} beginning ${lowestDate}`}
            // eslint-disable-next-line react-hooks/refs -- isOpen is state, not a ref
            aria-expanded={infoDropdown.isOpen}
            aria-haspopup="dialog"
            // eslint-disable-next-line react-hooks/refs -- isOpen is state, not a ref
            aria-controls={infoDropdown.isOpen ? popoverId : undefined}
            className="text-xs flex items-center gap-1 mt-2 mx-auto text-monarch-success underline decoration-dotted underline-offset-2"
            onClick={infoDropdown.open}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
              <polyline points="16 17 22 17 22 11"></polyline>
            </svg>
            {formatCurrency(Math.round(lowestMonthlyCost), { maximumFractionDigits: 0 })} beg. {lowestDate}
          </button>
        )}

        {/* Info Popover */}
        {/* eslint-disable react-hooks/refs -- dropdown hook returns state/callbacks, not ref.current access */}
        {infoDropdown.isOpen && (
          <Portal>
            <div
              className="fixed inset-0 z-(--z-index-popover)"
              onClick={infoDropdown.close}
              aria-hidden="true"
            />
            <div
              id={popoverId}
              ref={infoDropdown.dropdownRef}
              role="dialog"
              aria-labelledby={`${popoverId}-title`}
              aria-modal="true"
              onKeyDown={handlePopoverKeyDown}
              className="fixed z-(--z-index-popover) rounded-xl shadow-lg p-4 text-left w-70 bg-monarch-bg-card border border-monarch-border"
              style={{
                top: infoDropdown.position.top,
                right: infoDropdown.position.right,
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 id={`${popoverId}-title`} className="font-semibold text-sm text-monarch-text-dark">
                  Why will my costs decrease?
                </h3>
                <button
                  type="button"
                  onClick={infoDropdown.close}
                  aria-label="Close dialog"
                  className="-mt-1 -mr-1 p-1 transition-colors text-monarch-text-muted"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="text-xs space-y-2 text-monarch-text-muted">
                <p>
                  You're contributing <strong className="text-monarch-orange">{formatCurrency(catchUpAmount, { maximumFractionDigits: 0 })}/mo extra</strong> to
                  catch up on {itemsBehind.length} recurring item{itemsBehind.length === 1 ? '' : 's'}.
                </p>

                <div className="rounded-lg p-2 space-y-1 bg-monarch-bg-page">
                  <div className="flex justify-between">
                    <span>Base rate</span>
                    <span className="font-medium">{formatCurrency(Math.round(lowestMonthlyCost), { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-monarch-orange">
                    <span>+ Catch-up</span>
                    <span className="font-medium">{formatCurrency(catchUpAmount, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between pt-1 font-semibold text-monarch-text-dark border-t border-monarch-border">
                    <span>Current</span>
                    <span>{formatCurrency(currentMonthlyCost, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                <p>
                  After <strong>{lowestDate}</strong>, you'll only need <strong className="text-monarch-success">{formatCurrency(Math.round(lowestMonthlyCost), { maximumFractionDigits: 0 })}/mo</strong>.
                </p>
              </div>
            </div>
          </Portal>
        )}
        {/* eslint-enable react-hooks/refs */}

      </div>
    </div>
  );
}
