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
import { calculateStabilizationPoint, calculateBurndownData } from './charts';
import { AnchorIcon, TargetIcon } from './icons';

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

  // Calculate stabilization point
  const stabilization = useMemo(
    () => calculateStabilizationPoint(items, rollup.enabled ? rollup : null),
    [items, rollup]
  );

  const catchUpAmount = currentMonthlyCost - Math.round(lowestMonthlyCost);
  const itemsBehind = items.filter(i => i.is_enabled && i.progress_percent < 100);

  // Calculate monthly targets and progress for the widget
  const monthlyTargets = useMemo(() => {
    const enabledItems = items.filter(i => i.is_enabled);
    // Sum of all monthly targets (what we need to budget each month)
    const totalTargets = enabledItems.reduce((sum, item) => sum + item.frozen_monthly_target, 0)
      + (rollup.enabled ? rollup.total_frozen_monthly : 0);
    // Available balances (what's already saved from previous months)
    const availableBalances = enabledItems.filter(i => !i.is_in_rollup)
      .reduce((sum, item) => sum + item.current_balance, 0)
      + (rollup.enabled ? rollup.current_balance : 0);
    // Amount contributed this month
    const contributedThisMonth = enabledItems.filter(i => !i.is_in_rollup)
      .reduce((sum, item) => sum + item.contributed_this_month, 0)
      + (rollup.enabled ? (rollup.total_saved - rollup.current_balance) : 0);
    // Amount still needed = targets - available balances (min $0)
    const amountNeeded = Math.max(0, totalTargets - availableBalances);

    return { totalTargets, availableBalances, contributedThisMonth, amountNeeded };
  }, [items, rollup]);

  // Calculate untracked (disabled) recurring total
  const untrackedCategories = useMemo(() => {
    const disabledItems = items.filter(i => !i.is_enabled);
    return {
      total: disabledItems.reduce((sum, item) => sum + item.amount, 0),
    };
  }, [items]);

  // Generate month labels with projected amounts for the stabilization timeline
  const timelineMonths = useMemo(() => {
    if (!stabilization.hasCatchUp || stabilization.monthsUntilStable <= 0) return [];

    // Get burndown data to extract projected monthly amounts
    const burndownData = calculateBurndownData(items, currentMonthlyCost, lowestMonthlyCost);

    const months: { month: string; year: string; showYear: boolean; amount: number }[] = [];
    const now = new Date();
    let lastYear = now.getFullYear();

    // Start from next month since current month is already in progress
    for (let i = 1; i <= stabilization.monthsUntilStable; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = date.getFullYear();
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });

      // Find the matching burndown point for this month
      const burndownPoint = burndownData.find(p => p.month === monthLabel);
      const amount = burndownPoint?.amount ?? currentMonthlyCost;

      // Only show year when it changes from previous month
      const showYear = year !== lastYear;
      months.push({
        month: monthLabel,
        year: `'${year.toString().slice(-2)}`,
        showYear,
        amount: Math.round(amount),
      });
      lastYear = year;
    }
    return months;
  }, [stabilization.hasCatchUp, stabilization.monthsUntilStable, items, currentMonthlyCost, lowestMonthlyCost]);

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
      {/* Monthly Targets */}
      <div className={`rounded-xl px-4 pt-4 text-center bg-monarch-orange-light relative ${stabilization.hasCatchUp ? 'pb-4 rounded-b-none border-x border-t border-monarch-border' : 'pb-6'}`} data-tour="current-monthly">
        {/* Warning icon in top right corner when untracked categories exist */}
        {untrackedCategories.total > 0 && (
          <Tooltip content={
            <>
              <div className="font-medium">Excludes Untracked</div>
              <div className="text-monarch-text-muted text-xs mt-1">{formatCurrency(untrackedCategories.total, { maximumFractionDigits: 0 })} in categories not linked to recurring items</div>
            </>
          }>
            <span className="absolute top-3 right-3 cursor-help text-white" data-tour="untracked-warning">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </span>
          </Tooltip>
        )}
        {/* Centered target icon at top */}
        <div className="flex justify-center mb-2">
          <TargetIcon size={28} className="text-monarch-orange" aria-hidden="true" />
        </div>
        <div className="text-2xl font-bold mb-1 text-monarch-orange">
          <span>{formatCurrency(monthlyTargets.totalTargets, { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="text-sm text-monarch-text-dark">
          <span>Needed for {new Date().toLocaleDateString('en-US', { month: 'long' })}</span>
        </div>
        {/* Progress bar showing amount saved this month vs amount needed */}
        {monthlyTargets.amountNeeded > 0 && (
          <div className="mt-3">
            <div
              role="progressbar"
              aria-valuenow={Math.round((monthlyTargets.contributedThisMonth / monthlyTargets.amountNeeded) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Monthly savings progress: ${formatCurrency(monthlyTargets.contributedThisMonth, { maximumFractionDigits: 0 })} saved of ${formatCurrency(monthlyTargets.amountNeeded, { maximumFractionDigits: 0 })} needed`}
              aria-describedby={progressBarId}
              className="h-2 rounded-full overflow-hidden bg-monarch-orange/20"
            >
              <div
                className="h-full rounded-full transition-all bg-monarch-orange"
                style={{
                  width: `${Math.min(100, (monthlyTargets.contributedThisMonth / monthlyTargets.amountNeeded) * 100)}%`,
                }}
              />
            </div>
            <div id={progressBarId} className="flex justify-between mt-1 text-xs text-monarch-text-dark">
              <span>{formatCurrency(monthlyTargets.contributedThisMonth, { maximumFractionDigits: 0 })} saved</span>
              <span>{formatCurrency(Math.max(0, monthlyTargets.amountNeeded - monthlyTargets.contributedThisMonth), { maximumFractionDigits: 0 })} to go</span>
            </div>
          </div>
        )}
        {/* Stable Rate Info Popover */}
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
                  Stabilization Point
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

              <div className="text-xs space-y-3 text-monarch-text-muted">
                <p className="leading-relaxed">
                  {stabilization.monthsUntilStable > 0 ? (
                    <>
                      Your monthly rate will stabilize at{' '}
                      <span className="font-medium text-monarch-success">
                        {formatCurrency(stabilization.stableMonthlyRate, { maximumFractionDigits: 0 })}
                      </span>
                      {' '}in {stabilization.monthsUntilStable} month{stabilization.monthsUntilStable === 1 ? '' : 's'} when all catch-up payments complete.
                    </>
                  ) : (
                    <>
                      Your monthly rate is already at its stable level of{' '}
                      <span className="font-medium text-monarch-success">
                        {formatCurrency(stabilization.stableMonthlyRate, { maximumFractionDigits: 0 })}
                      </span>.
                    </>
                  )}
                </p>

                {catchUpAmount > 0 && (
                  <div className="rounded-lg p-2 space-y-1 bg-monarch-bg-page">
                    <div className="flex justify-between">
                      <span>Stable rate</span>
                      <span className="font-medium text-monarch-success">{formatCurrency(Math.round(lowestMonthlyCost), { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between text-monarch-orange">
                      <span>+ Catch-up ({itemsBehind.length} item{itemsBehind.length === 1 ? '' : 's'})</span>
                      <span className="font-medium">{formatCurrency(catchUpAmount, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between pt-1 font-semibold text-monarch-text-dark border-t border-monarch-border">
                      <span>Current</span>
                      <span>{formatCurrency(currentMonthlyCost, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                )}

                <p className="text-[11px] italic">
                  The stable rate is the sum of each expense's ideal monthly rate (cost ÷ frequency). Over-contributing is not reflected in this projection.
                </p>
              </div>
            </div>
          </Portal>
        )}
        {/* eslint-enable react-hooks/refs */}

      </div>

      {/* Stabilization Timeline + Card */}
      {stabilization.hasCatchUp && (
        <button
          // eslint-disable-next-line react-hooks/refs -- passing ref object to ref prop is correct
          ref={infoDropdown.triggerRef}
          type="button"
          aria-label={`View details: Stable rate of ${formatCurrency(stabilization.stableMonthlyRate, { maximumFractionDigits: 0 })} starting ${stabilization.stabilizationDate}`}
          // eslint-disable-next-line react-hooks/refs -- isOpen is state, not a ref
          aria-expanded={infoDropdown.isOpen}
          aria-haspopup="dialog"
          // eslint-disable-next-line react-hooks/refs -- isOpen is state, not a ref
          aria-controls={infoDropdown.isOpen ? popoverId : undefined}
          className="w-full hover:opacity-90 transition-opacity rounded-b-xl border-x border-b border-monarch-border bg-monarch-bg-card overflow-hidden -mt-px"
          // eslint-disable-next-line react-hooks/refs -- toggle is a stable callback, not a ref access
          onClick={infoDropdown.toggle}
        >
          {/* Month rows section */}
          <div className="flex px-3 py-2">
            {/* Timeline track */}
            <div className="w-6 flex flex-col items-center relative">
              {/* Vertical line connecting all dots */}
              <div className="absolute left-1/2 -translate-x-1/2 w-px bg-neutral-200 top-2.75 bottom-2.75" />
              {/* Dots - each in a container matching row height */}
              {timelineMonths.slice(0, -1).map((item) => (
                <div key={`dot-${item.month}-${item.year}`} className="h-5.5 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 z-10" />
                </div>
              ))}
            </div>
            {/* Content */}
            <div className="flex-1 flex flex-col">
              {timelineMonths.slice(0, -1).map((item) => (
                <div key={`row-${item.month}-${item.year}`} className="h-5.5 flex items-center text-xs text-monarch-text-muted">
                  <span className="flex-1">{item.month}{item.showYear && ` ${item.year}`}</span>
                  <span>{formatCurrency(item.amount, { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Stabilization row with success background - styled as link */}
          <div
            className="flex items-center px-3 py-2 transition-colors"
            style={{ backgroundColor: 'var(--monarch-success-bg)' }}
          >
            <div className="w-6 flex justify-center">
              <AnchorIcon size={14} className="text-monarch-success" aria-hidden="true" />
            </div>
            <div className="flex-1 flex items-center justify-between text-monarch-success">
              <span className="text-xs font-medium underline underline-offset-2" style={{ textDecorationColor: 'var(--monarch-success)' }}>{stabilization.stabilizationDate}</span>
              <span className="text-sm font-semibold">
                {formatCurrency(stabilization.stableMonthlyRate, { maximumFractionDigits: 0 })}/mo
              </span>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
