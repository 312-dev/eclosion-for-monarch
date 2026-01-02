import { useState, useRef, useEffect, useMemo } from 'react';
import type { ReadyToAssign as ReadyToAssignData, RecurringItem, DashboardSummary, RollupData } from '../types';
import { Portal } from './Portal';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Area } from 'recharts';
import { formatCurrency } from '../utils';
import { Tooltip } from './ui/Tooltip';
import { useDropdown } from '../hooks';
import { Z_INDEX } from '../constants';

export interface BurndownPoint {
  month: string;
  fullLabel: string;
  amount: number;
  rollupAmount: number;
  hasChange: boolean;
  completingItems: string[];
}

export function calculateBurndownData(items: RecurringItem[], currentMonthlyCost: number, lowestMonthlyCost: number): BurndownPoint[] {
  const enabledItems = items.filter(i => i.is_enabled && i.progress_percent < 100);

  if (enabledItems.length === 0) return [];

  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Sort items by next_due_date
  const sortedItems = [...enabledItems].sort((a, b) =>
    new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()
  );

  // Find the latest due date (when we reach minimum)
  const lastItem = sortedItems[sortedItems.length - 1];
  if (!lastItem) return [];
  const latestDate = new Date(lastItem.next_due_date);
  const latestEndMonth = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 1);

  // Ensure at least 6 months are shown
  const minEndMonth = new Date(startMonth.getFullYear(), startMonth.getMonth() + 6, 1);
  const endMonth = new Date(Math.max(latestEndMonth.getTime(), minEndMonth.getTime()));

  // Calculate initial rollup contribution (sum of frozen_monthly_target for rollup items)
  // Note: rollup items may not be individually "enabled" - they're tracked via the shared rollup category
  const rollupItems = items.filter(i => i.is_in_rollup);
  // For rollup items, always use ideal_monthly_rate since catch-up is managed
  // at the rollup category level, not per-item
  let rollupRunningTotal = rollupItems.reduce((sum, item) => sum + item.ideal_monthly_rate, 0);

  // Calculate lowest rollup cost (ideal rates only)
  const lowestRollupCost = rollupItems.reduce((sum, item) => sum + item.ideal_monthly_rate, 0);

  const points: BurndownPoint[] = [];
  let runningTotal = currentMonthlyCost;
  let currentMonth = new Date(startMonth);
  const processedItems = new Set<string>();

  // Calculate total months in range - if <= 6, show all months
  const totalMonths = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 +
    (endMonth.getMonth() - startMonth.getMonth()) + 1;
  const showAllMonths = totalMonths <= 6;

  while (currentMonth <= endMonth) {
    // Check which items complete in this month
    // Items are considered completing if their due date is in this month OR before (for overdue items on first iteration)
    const completingThisMonth = sortedItems.filter(item => {
      if (processedItems.has(item.id)) return false;
      const dueDate = new Date(item.next_due_date);
      const dueMonth = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);

      // On first month, also catch any overdue items (due before start)
      const isFirst = points.length === 0;
      if (isFirst && dueMonth < startMonth) {
        return true;
      }

      return dueDate.getFullYear() === currentMonth.getFullYear() &&
             dueDate.getMonth() === currentMonth.getMonth();
    });

    // Calculate how much catch-up drops when items complete
    // frozen_monthly_target is the catch-up aware rate, ideal_monthly_rate is the steady-state rate
    for (const item of completingThisMonth) {
      const currentRate = item.frozen_monthly_target || item.ideal_monthly_rate || 0;
      const catchUpAmount = currentRate - item.ideal_monthly_rate;
      if (catchUpAmount > 0) {
        runningTotal -= catchUpAmount;
        // Also reduce rollup running total if this is a rollup item
        if (item.is_in_rollup) {
          rollupRunningTotal -= catchUpAmount;
        }
      }
      processedItems.add(item.id);
    }

    // Add point if: showing all months, there's a change, or it's the first/last month
    const isFirst = points.length === 0;
    const isLast = currentMonth.getTime() === endMonth.getTime();

    if (showAllMonths || isFirst || completingThisMonth.length > 0 || isLast) {
      const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'short' });
      const yearLabel = currentMonth.getFullYear().toString().slice(-2);

      // For the last point, use the known lowest cost to ensure accuracy
      const amount = isLast ? Math.round(lowestMonthlyCost) : Math.max(0, Math.round(runningTotal));
      const rollupAmount = isLast ? Math.round(lowestRollupCost) : Math.max(0, Math.round(rollupRunningTotal));

      points.push({
        month: monthLabel,
        fullLabel: `${monthLabel} '${yearLabel}`,
        amount,
        rollupAmount,
        hasChange: completingThisMonth.length > 0,
        completingItems: completingThisMonth.map(i => i.name)
      });
    }

    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  }

  return points;
}

type FormatCurrencyFn = (amount: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) => string;

interface BurndownChartProps {
  data: BurndownPoint[];
  formatCurrency: FormatCurrencyFn;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: BurndownPoint }>;
  formatCurrency: FormatCurrencyFn;
  coordinate?: { x: number; y: number };
  viewBox?: { x: number; y: number; width: number; height: number };
}

function CustomTooltip({ active, payload, formatCurrency, coordinate }: CustomTooltipProps) {
  const [chartRect, setChartRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Get chart position on first render
  useEffect(() => {
    if (tooltipRef.current && !chartRect) {
      const chartContainer = tooltipRef.current.closest('.recharts-wrapper');
      if (chartContainer) {
        setChartRect(chartContainer.getBoundingClientRect());
      }
    }
  });

  const firstPayload = payload?.[0];
  if (!active || !firstPayload || !coordinate) return null;

  const data = firstPayload.payload;

  // Calculate position directly from current coordinate, with viewport boundary checks
  const tooltipWidth = 180;
  const tooltipHeight = 80;
  let position = null;
  if (chartRect) {
    let left = chartRect.left + coordinate.x + 10;
    let top = chartRect.top + coordinate.y - 60;

    // Check right edge - flip to left side if needed
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = chartRect.left + coordinate.x - tooltipWidth - 10;
    }
    // Check bottom edge
    if (top + tooltipHeight > window.innerHeight - 10) {
      top = window.innerHeight - tooltipHeight - 10;
    }
    // Check top edge
    if (top < 10) {
      top = 10;
    }

    position = { top, left };
  }

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className="px-2 py-1.5 rounded-md shadow-lg text-xs"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
        position: position ? 'fixed' : 'relative',
        top: position?.top,
        left: position?.left,
        zIndex: Z_INDEX.TOOLTIP,
        pointerEvents: 'none',
      }}
    >
      <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
        {data.fullLabel}
      </div>
      <div style={{ color: 'var(--monarch-success)' }}>
        {formatCurrency(data.amount, { maximumFractionDigits: 0 })}/mo
      </div>
      {data.rollupAmount > 0 && (
        <div className="text-[10px]" style={{ color: 'var(--monarch-text-muted)' }}>
          incl. {formatCurrency(data.rollupAmount, { maximumFractionDigits: 0 })} rollup
        </div>
      )}
      {data.completingItems.length > 0 && (
        <div className="text-[10px] mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
          <div>Caught up:</div>
          {data.completingItems.map((item, i) => (
            <div key={i}>• {item}</div>
          ))}
        </div>
      )}
    </div>
  );

  // Render via Portal to escape sidebar overflow
  return position ? <Portal>{tooltipContent}</Portal> : tooltipContent;
}

// Hook to get CSS variable values for Recharts
function useChartColors() {
  const [colors, setColors] = useState({
    success: '#22a06b',
    textMuted: '#7e7b78',
    border: '#e8e6e3',
    bgCard: '#ffffff',
  });

  useEffect(() => {
    const updateColors = () => {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      setColors({
        success: style.getPropertyValue('--monarch-success').trim() || '#22a06b',
        textMuted: style.getPropertyValue('--monarch-text-muted').trim() || '#7e7b78',
        border: style.getPropertyValue('--monarch-border').trim() || '#e8e6e3',
        bgCard: style.getPropertyValue('--monarch-bg-card').trim() || '#ffffff',
      });
    };

    updateColors();

    // Watch for theme changes via class mutation
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          updateColors();
          break;
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  return colors;
}

export function BurndownChart({ data, formatCurrency }: BurndownChartProps) {
  const colors = useChartColors();

  if (data.length < 2) return null;

  const minAmount = Math.min(...data.map(d => d.amount));
  const maxAmount = Math.max(...data.map(d => d.amount));
  // Add some padding to the domain - use 5% of max value for flat lines, otherwise 10% of range
  const range = maxAmount - minAmount;
  const padding = range > 0 ? range * 0.15 : maxAmount * 0.02;

  // Calculate minimum width based on number of data points (50px per point, minimum 100%)
  const minChartWidth = Math.max(100, data.length * 50);
  const needsScroll = data.length > 6;

  return (
    <div
      className="mt-3"
      style={{
        height: 180,
        overflowX: needsScroll ? 'auto' : 'visible',
        overflowY: 'visible',
      }}
    >
      <div style={{ width: needsScroll ? `${minChartWidth}px` : '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="burndownGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.success} stopOpacity={0.2} />
                <stop offset="100%" stopColor={colors.success} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="fullLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: colors.textMuted }}
              interval={0}
              dy={10}
            />
            <YAxis
              domain={[minAmount - padding, maxAmount + padding]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: colors.textMuted }}
              tickFormatter={(value) => formatCurrency(value, { maximumFractionDigits: 0 })}
              width={50}
              orientation="left"
            />
            <RechartsTooltip
              content={<CustomTooltip formatCurrency={formatCurrency} />}
              cursor={{ stroke: colors.border, strokeDasharray: '3 3' }}
              allowEscapeViewBox={{ x: true, y: true }}
              wrapperStyle={{ zIndex: Z_INDEX.TOOLTIP, pointerEvents: 'none' }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="none"
              fill="url(#burndownGradient)"
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke={colors.success}
              strokeWidth={2}
              dot={({ cx, cy, payload, index }) => {
                const isEndpoint = index === 0 || index === data.length - 1;
                const hasChange = payload.hasChange;
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={isEndpoint || hasChange ? colors.success : colors.bgCard}
                    stroke={colors.success}
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 5, fill: colors.success, stroke: colors.success }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

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
  const infoDropdown = useDropdown<HTMLDivElement, HTMLButtonElement>({
    alignment: 'right',
    offset: { y: 8 },
  });

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
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{ backgroundColor: 'var(--monarch-bg-card)', borderBottom: '1px solid var(--monarch-border)' }}
      >
        {/* Left to Budget */}
        <a
          href="https://app.monarch.com/plan"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg px-3 py-2 flex flex-col items-center shrink-0 hover:opacity-80 transition-opacity"
          style={{ backgroundColor: isPositive ? 'var(--monarch-success-bg)' : 'var(--monarch-error-bg)' }}
        >
          <div
            className="text-lg font-bold"
            style={{ color: isPositive ? 'var(--monarch-success)' : 'var(--monarch-error)' }}
          >
            {formatCurrency(data.ready_to_assign, { maximumFractionDigits: 0 })}
          </div>
          <div
            className="text-xs flex items-center gap-0.5"
            style={{ color: isPositive ? 'var(--monarch-success)' : 'var(--monarch-error)' }}
          >
            Left to budget
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </div>
        </a>

        {/* Current Monthly */}
        <div className="text-center shrink-0">
          <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>Monthly</div>
          <div className="text-base font-semibold" style={{ color: 'var(--monarch-orange)' }}>
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
      <div
        className="rounded-xl px-4 pt-4 pb-6 text-center"
        style={{ backgroundColor: 'var(--monarch-orange-light)' }}
      >
        <div
          className="flex items-center justify-center gap-1.5 text-2xl font-bold mb-1"
          style={{ color: 'var(--monarch-orange)' }}
        >
          <span>{formatCurrency(currentMonthlyCost, { maximumFractionDigits: 0 })}</span>
          {untrackedCategories.total > 0 && (
            <Tooltip content={`Excluding ${formatCurrency(untrackedCategories.total, { maximumFractionDigits: 0 })} untracked`}>
              <span className="cursor-help">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--monarch-warning)' }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </span>
            </Tooltip>
          )}
        </div>
        <div
          className="flex items-center justify-center gap-1.5 text-sm"
          style={{ color: 'var(--monarch-text-dark)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(255, 105, 45, 0.2)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((dedicatedCategories.saved + rollup.total_saved) / currentMonthlyCost) * 100)}%`,
                  backgroundColor: 'var(--monarch-orange)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--monarch-text-dark)' }}>
              <span>{formatCurrency(dedicatedCategories.saved + rollup.total_saved, { maximumFractionDigits: 0 })} saved</span>
              <span>{formatCurrency(Math.max(0, currentMonthlyCost - dedicatedCategories.saved - rollup.total_saved), { maximumFractionDigits: 0 })} to go</span>
            </div>
          </div>
        )}
        {showAnticipatedLower && (
          <button
            ref={infoDropdown.triggerRef}
            className="text-xs flex items-center gap-1 mt-2 mx-auto"
            style={{
              color: 'var(--monarch-success)',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textUnderlineOffset: '2px',
            }}
            onClick={infoDropdown.open}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
              <polyline points="16 17 22 17 22 11"></polyline>
            </svg>
            {formatCurrency(Math.round(lowestMonthlyCost), { maximumFractionDigits: 0 })} beg. {lowestDate}
          </button>
        )}

        {/* Info Popover */}
        {infoDropdown.isOpen && (
          <Portal>
            <div
              className="fixed inset-0 z-(--z-index-popover)"
              onClick={infoDropdown.close}
            />
            <div
              ref={infoDropdown.dropdownRef}
              className="fixed z-(--z-index-popover) rounded-xl shadow-lg p-4 text-left"
              style={{
                backgroundColor: 'var(--monarch-bg-card)',
                border: '1px solid var(--monarch-border)',
                width: '280px',
                top: infoDropdown.position.top,
                right: infoDropdown.position.right,
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="font-semibold text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                  Why will my costs decrease?
                </div>
                <button
                  onClick={infoDropdown.close}
                  className="-mt-1 -mr-1 p-1 transition-colors"
                  style={{ color: 'var(--monarch-text-muted)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="text-xs space-y-2" style={{ color: 'var(--monarch-text-muted)' }}>
                <p>
                  You're contributing <strong style={{ color: 'var(--monarch-orange)' }}>{formatCurrency(catchUpAmount, { maximumFractionDigits: 0 })}/mo extra</strong> to
                  catch up on {itemsBehind.length} recurring item{itemsBehind.length === 1 ? '' : 's'}.
                </p>

                <div className="rounded-lg p-2 space-y-1" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
                  <div className="flex justify-between">
                    <span>Base rate</span>
                    <span className="font-medium">{formatCurrency(Math.round(lowestMonthlyCost), { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: 'var(--monarch-orange)' }}>
                    <span>+ Catch-up</span>
                    <span className="font-medium">{formatCurrency(catchUpAmount, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between pt-1 font-semibold" style={{ color: 'var(--monarch-text-dark)', borderTop: '1px solid var(--monarch-border)' }}>
                    <span>Current</span>
                    <span>{formatCurrency(currentMonthlyCost, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                <p>
                  After <strong>{lowestDate}</strong>, you'll only need <strong style={{ color: 'var(--monarch-success)' }}>{formatCurrency(Math.round(lowestMonthlyCost), { maximumFractionDigits: 0 })}/mo</strong>.
                </p>
              </div>
            </div>
          </Portal>
        )}

      </div>
    </div>
  );
}
