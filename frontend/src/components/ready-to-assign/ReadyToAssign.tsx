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
import type {
  ReadyToAssign as ReadyToAssignData,
  RecurringItem,
  DashboardSummary,
  RollupData,
} from '../../types';
import { formatCurrency } from '../../utils';
import { Tooltip } from '../ui/Tooltip';
import { useDropdown } from '../../hooks';
import { calculateBurndownData } from '../charts';
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

export function ReadyToAssign({
  data,
  summary: _summary,
  items,
  rollup,
  variant = 'sidebar',
}: ReadyToAssignProps) {
  const progressBarId = useId();
  const popoverId = useId();

  const infoDropdown = useDropdown<HTMLDivElement, HTMLButtonElement>({
    alignment: 'right',
    offset: { y: 8 },
  });

  const handleFocusTrigger = () => {
    infoDropdown.triggerRef.current?.focus();
  };

  // Calculate current monthly cost as sum of frozen targets - this is what you
  // actually need to budget THIS month. Future months use max(frozen, ideal).
  const currentMonthlyCost = useMemo(() => {
    const enabledItems = items.filter((i) => i.is_enabled && !i.is_in_rollup);
    const itemsTotal = enabledItems.reduce((sum, item) => sum + item.frozen_monthly_target, 0);
    const rollupItems = items.filter((i) => i.is_in_rollup);
    const rollupTotal = rollupItems.reduce((sum, item) => sum + item.frozen_monthly_target, 0);
    return itemsTotal + rollupTotal;
  }, [items]);

  // Calculate burndown data and stabilization in one pass - single source of truth
  const { stabilization, points: burndownPoints } = useMemo(
    () => calculateBurndownData(items, currentMonthlyCost),
    [items, currentMonthlyCost]
  );

  const catchUpAmount = currentMonthlyCost - stabilization.stableMonthlyRate;
  const itemsBehind = items.filter((i) => i.is_enabled && i.progress_percent < 100);

  // Calculate monthly targets and progress for the widget
  // "saved" = total budgeted this month (planned_budget), "to go" = target - saved
  // Uses frozen_monthly_target - what you actually need to budget THIS month
  const monthlyTargets = useMemo(() => {
    const enabledItems = items.filter((i) => i.is_enabled && !i.is_in_rollup);
    const rollupItems = items.filter((i) => i.is_in_rollup);
    const totalTargets =
      enabledItems.reduce((sum, item) => sum + item.frozen_monthly_target, 0) +
      rollupItems.reduce((sum, item) => sum + item.frozen_monthly_target, 0);
    // "saved" is total budgeted this month across all categories
    // Note: rollup.budgeted is the actual amount budgeted in the rollup category - this is correct
    const totalBudgeted =
      enabledItems.reduce((sum, item) => sum + item.planned_budget, 0) +
      (rollup.enabled ? rollup.budgeted : 0);
    const toGo = Math.max(0, totalTargets - totalBudgeted);
    return { totalTargets, totalBudgeted, toGo };
  }, [items, rollup]);

  // Determine if monthly target is fully funded (to go <= 0)
  const isMonthlyFunded = monthlyTargets.toGo <= 0;

  // Calculate untracked (disabled) recurring total
  const untrackedCategories = useMemo(() => {
    const disabledItems = items.filter((i) => !i.is_enabled);
    return { total: disabledItems.reduce((sum, item) => sum + item.amount, 0) };
  }, [items]);

  // Generate month labels with projected amounts for the stabilization timeline
  // Each month shows the "Needed for THAT MONTH" value when that month arrives
  const timelineMonths = useMemo(() => {
    if (!stabilization.hasCatchUp || stabilization.monthsUntilStable <= 0) return [];
    const months: { month: string; year: string; showYear: boolean; amount: number }[] = [];
    const now = new Date();
    let lastYear = now.getFullYear();

    for (let i = 1; i <= stabilization.monthsUntilStable; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = date.getFullYear();
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      const burndownPoint = burndownPoints.find((p) => p.month === monthLabel);
      const amount = burndownPoint?.amount ?? currentMonthlyCost;
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
  }, [
    stabilization.hasCatchUp,
    stabilization.monthsUntilStable,
    burndownPoints,
    currentMonthlyCost,
  ]);

  // Mobile horizontal layout
  if (variant === 'mobile') {
    return <MobileReadyToAssign data={data} currentMonthlyCost={currentMonthlyCost} />;
  }

  // Sidebar vertical layout
  return (
    <div className="stats-sidebar-content">
      {/* Monthly Targets */}
      <div
        className={`rounded-xl px-4 pt-4 text-center relative ${isMonthlyFunded ? 'bg-(--monarch-success-bg)' : 'bg-monarch-orange-light'} ${stabilization.hasCatchUp ? 'pb-4 rounded-b-none border-x border-t border-monarch-border' : 'pb-6'}`}
        data-tour="current-monthly"
      >
        {/* Warning icon in top right corner when untracked categories exist */}
        {untrackedCategories.total > 0 && (
          <Tooltip
            content={
              <>
                <div className="font-medium">Excludes Untracked</div>
                <div className="text-monarch-text-muted text-xs mt-1">
                  {formatCurrency(untrackedCategories.total, { maximumFractionDigits: 0 })} in
                  categories not linked to recurring items
                </div>
              </>
            }
          >
            <span
              className="absolute top-3 right-3 cursor-help text-white"
              data-tour="untracked-warning"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </span>
          </Tooltip>
        )}
        {/* Centered target icon at top */}
        <div className="flex justify-center mb-2">
          <TargetIcon
            size={28}
            className={isMonthlyFunded ? 'text-(--monarch-success)' : 'text-monarch-orange'}
            aria-hidden="true"
          />
        </div>
        <div
          className={`text-2xl font-bold mb-1 ${isMonthlyFunded ? 'text-(--monarch-success)' : 'text-monarch-orange'}`}
        >
          <span>{formatCurrency(monthlyTargets.totalTargets, { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="text-sm text-monarch-text-dark">
          <span>Needed for {new Date().toLocaleDateString('en-US', { month: 'long' })}</span>
        </div>
        {/* Progress bar showing amount budgeted vs target */}
        {monthlyTargets.totalTargets > 0 && (
          <div className="mt-3">
            <div
              role="progressbar"
              aria-valuenow={Math.round(
                (monthlyTargets.totalBudgeted / monthlyTargets.totalTargets) * 100
              )}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Monthly savings progress: ${formatCurrency(monthlyTargets.totalBudgeted, { maximumFractionDigits: 0 })} saved of ${formatCurrency(monthlyTargets.totalTargets, { maximumFractionDigits: 0 })} needed`}
              aria-describedby={progressBarId}
              className={`h-2 rounded-full overflow-hidden ${isMonthlyFunded ? 'bg-(--monarch-success)/20' : 'bg-monarch-orange/20'}`}
            >
              <div
                className={`h-full rounded-full transition-all ${isMonthlyFunded ? 'bg-(--monarch-success)' : 'bg-monarch-orange'}`}
                style={{
                  width: `${Math.min(100, (monthlyTargets.totalBudgeted / monthlyTargets.totalTargets) * 100)}%`,
                }}
              />
            </div>
            <div
              id={progressBarId}
              className="flex justify-between mt-1 text-xs text-monarch-text-dark"
            >
              <span>
                {formatCurrency(monthlyTargets.totalBudgeted, { maximumFractionDigits: 0 })} saved
              </span>
              <span>{formatCurrency(monthlyTargets.toGo, { maximumFractionDigits: 0 })} to go</span>
            </div>
          </div>
        )}

        {/* Stable Rate Info Popover */}
        <StabilizationPopover
          popoverId={popoverId}
          isOpen={infoDropdown.isOpen}
          position={infoDropdown.position}
          onClose={infoDropdown.close}
          onFocusTrigger={handleFocusTrigger}
          dropdownRef={infoDropdown.dropdownRef}
          stabilization={stabilization}
          catchUpAmount={catchUpAmount}
          itemsBehindCount={itemsBehind.length}
          currentMonthlyCost={currentMonthlyCost}
        />
      </div>

      {/* Stabilization Timeline + Card */}
      <StabilizationTimeline
        popoverId={popoverId}
        isOpen={infoDropdown.isOpen}
        onToggle={infoDropdown.toggle}
        triggerRef={infoDropdown.triggerRef}
        stabilization={stabilization}
        timelineMonths={timelineMonths}
      />
    </div>
  );
}
