/**
 * ReadyToAssign - Sidebar component showing budget status and monthly savings
 *
 * Accessibility features:
 * - aria-label on interactive elements
 * - aria-describedby for progress bars
 * - Keyboard accessible popover with Escape to close
 * - Proper focus management
 */

import { useMemo, useId } from 'react';
import type { ReadyToAssign as ReadyToAssignData, RecurringItem, DashboardSummary, RollupData } from '../../types';
import { formatCurrency } from '../../utils';
import { Tooltip } from '../ui/Tooltip';
import { useDropdown } from '../../hooks';
import { calculateStabilizationPoint, calculateBurndownData } from '../charts';
import { TargetIcon } from '../icons';
import { MobileReadyToAssign } from './MobileReadyToAssign';
import { StabilizationPopover, StabilizationTimeline } from './StabilizationTimeline';

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

  const currentMonthlyCost = summary.total_monthly_contribution;
  const lowestMonthlyCost = items.filter((i) => i.is_enabled).reduce((sum, item) => sum + item.ideal_monthly_rate, 0);

  // Calculate stabilization point
  const stabilization = useMemo(() => calculateStabilizationPoint(items, rollup.enabled ? rollup : null), [items, rollup]);

  const catchUpAmount = currentMonthlyCost - Math.round(lowestMonthlyCost);
  const itemsBehind = items.filter((i) => i.is_enabled && i.progress_percent < 100);

  // Calculate monthly targets and progress for the widget
  const monthlyTargets = useMemo(() => {
    const enabledItems = items.filter((i) => i.is_enabled);
    const totalTargets =
      enabledItems.reduce((sum, item) => sum + item.frozen_monthly_target, 0) + (rollup.enabled ? rollup.total_frozen_monthly : 0);
    const availableBalances =
      enabledItems.filter((i) => !i.is_in_rollup).reduce((sum, item) => sum + item.current_balance, 0) +
      (rollup.enabled ? rollup.current_balance : 0);
    const contributedThisMonth =
      enabledItems.filter((i) => !i.is_in_rollup).reduce((sum, item) => sum + item.contributed_this_month, 0) +
      (rollup.enabled ? rollup.total_saved - rollup.current_balance : 0);
    const amountNeeded = Math.max(0, totalTargets - availableBalances);
    return { totalTargets, availableBalances, contributedThisMonth, amountNeeded };
  }, [items, rollup]);

  // Calculate untracked (disabled) recurring total
  const untrackedCategories = useMemo(() => {
    const disabledItems = items.filter((i) => !i.is_enabled);
    return { total: disabledItems.reduce((sum, item) => sum + item.amount, 0) };
  }, [items]);

  // Generate month labels with projected amounts for the stabilization timeline
  const timelineMonths = useMemo(() => {
    if (!stabilization.hasCatchUp || stabilization.monthsUntilStable <= 0) return [];
    const burndownData = calculateBurndownData(items, currentMonthlyCost, lowestMonthlyCost);
    const months: { month: string; year: string; showYear: boolean; amount: number }[] = [];
    const now = new Date();
    let lastYear = now.getFullYear();

    for (let i = 1; i <= stabilization.monthsUntilStable; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = date.getFullYear();
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      const burndownPoint = burndownData.find((p) => p.month === monthLabel);
      const amount = burndownPoint?.amount ?? currentMonthlyCost;
      const showYear = year !== lastYear;
      months.push({ month: monthLabel, year: `'${year.toString().slice(-2)}`, showYear, amount: Math.round(amount) });
      lastYear = year;
    }
    return months;
  }, [stabilization.hasCatchUp, stabilization.monthsUntilStable, items, currentMonthlyCost, lowestMonthlyCost]);

  // Mobile horizontal layout
  if (variant === 'mobile') {
    return <MobileReadyToAssign data={data} currentMonthlyCost={currentMonthlyCost} />;
  }

  // Sidebar vertical layout
  return (
    <div className="stats-sidebar-content">
      {/* Monthly Targets */}
      <div
        className={`rounded-xl px-4 pt-4 text-center bg-monarch-orange-light relative ${stabilization.hasCatchUp ? 'pb-4 rounded-b-none border-x border-t border-monarch-border' : 'pb-6'}`}
        data-tour="current-monthly"
      >
        {/* Warning icon in top right corner when untracked categories exist */}
        {untrackedCategories.total > 0 && (
          <Tooltip
            content={
              <>
                <div className="font-medium">Excludes Untracked</div>
                <div className="text-monarch-text-muted text-xs mt-1">
                  {formatCurrency(untrackedCategories.total, { maximumFractionDigits: 0 })} in categories not linked to recurring items
                </div>
              </>
            }
          >
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
                style={{ width: `${Math.min(100, (monthlyTargets.contributedThisMonth / monthlyTargets.amountNeeded) * 100)}%` }}
              />
            </div>
            <div id={progressBarId} className="flex justify-between mt-1 text-xs text-monarch-text-dark">
              <span>{formatCurrency(monthlyTargets.contributedThisMonth, { maximumFractionDigits: 0 })} saved</span>
              <span>{formatCurrency(Math.max(0, monthlyTargets.amountNeeded - monthlyTargets.contributedThisMonth), { maximumFractionDigits: 0 })} to go</span>
            </div>
          </div>
        )}

        {/* Stable Rate Info Popover */}
        <StabilizationPopover
          popoverId={popoverId}
          infoDropdown={infoDropdown}
          stabilization={stabilization}
          lowestMonthlyCost={lowestMonthlyCost}
          catchUpAmount={catchUpAmount}
          itemsBehindCount={itemsBehind.length}
          currentMonthlyCost={currentMonthlyCost}
        />
      </div>

      {/* Stabilization Timeline + Card */}
      <StabilizationTimeline popoverId={popoverId} infoDropdown={infoDropdown} stabilization={stabilization} timelineMonths={timelineMonths} />
    </div>
  );
}
