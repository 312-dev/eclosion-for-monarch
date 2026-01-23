/* eslint-disable max-lines -- Complex chart component with tooltip, hooks, and rendering logic */
/**
 * StashProgressChart - Progress visualization for stash items
 *
 * Shows cumulative balance lines for each stash item and
 * monthly contribution bars (total across all visible stashes).
 */

import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Z_INDEX } from '../../constants';
import type { StashHistoryItem, StashReportTabMode } from '../../types';

// Color palette for stash lines (distinct, colorblind-friendly)
const LINE_COLORS = [
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#F44336', // Red
  '#00BCD4', // Cyan
  '#795548', // Brown
  '#607D8B', // Blue Grey
];

interface ChartDataPoint {
  month: string;
  monthLabel: string;
  totalContribution: number;
  [key: string]: string | number; // Dynamic keys for each stash balance and contribution
}

interface StashProgressChartProps {
  readonly items: readonly StashHistoryItem[];
  readonly months: readonly string[];
  readonly visibleStashIds: readonly string[];
  readonly activeTab: StashReportTabMode;
  readonly formatCurrency: (amount: number) => string;
}

/**
 * Hook to get CSS variable values for Recharts.
 */
function useChartColors() {
  const [colors, setColors] = useState({
    textMuted: '#7e7b78',
    border: '#e8e6e3',
    bgCard: '#ffffff',
    barColor: '#94a3b8', // Neutral slate for contribution bars
  });

  useEffect(() => {
    const updateColors = () => {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      setColors({
        textMuted: style.getPropertyValue('--monarch-text-muted').trim() || '#7e7b78',
        border: style.getPropertyValue('--monarch-border').trim() || '#e8e6e3',
        bgCard: style.getPropertyValue('--monarch-bg-card').trim() || '#ffffff',
        barColor: style.getPropertyValue('--monarch-text-muted').trim() || '#94a3b8',
      });
    };

    updateColors();

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

/**
 * Format month string (YYYY-MM) to short label (Jan, Feb, etc.)
 */
function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(Number(year), Number(monthNum) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short' });
}

/**
 * Custom legend with column layout for many items.
 */
function CustomLegend({
  payload,
  items,
  stashColors,
}: {
  readonly payload?: ReadonlyArray<{ dataKey: string; color: string; value: string }>;
  readonly items: readonly StashHistoryItem[];
  readonly stashColors: Readonly<Record<string, string>>;
}) {
  if (!payload || payload.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-1.5 px-4 pb-3">
      {payload.map((entry) => {
        const itemId = entry.dataKey.replace(/^(balance_|contribution_)/, '');
        const item = items.find((i) => i.id === itemId);
        const color = stashColors[itemId] ?? entry.color;

        return (
          <div key={entry.dataKey} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              {item?.name ?? entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Custom tooltip for the chart.
 */
function CustomTooltip({
  active,
  payload,
  label,
  items,
  formatCurrency,
  colors,
  activeTab,
}: {
  readonly active?: boolean;
  readonly payload?: ReadonlyArray<{ dataKey: string; value: number; color: string; payload?: ChartDataPoint }>;
  readonly label?: string;
  readonly items: readonly StashHistoryItem[];
  readonly formatCurrency: (amount: number) => string;
  readonly colors: ReturnType<typeof useChartColors>;
  readonly activeTab: StashReportTabMode;
}) {
  if (!active || !payload || payload.length === 0 || !label) return null;

  // Extract the original month value (YYYY-MM) from the chart data payload
  const month = payload[0]?.payload?.month;
  if (!month) return null;

  const monthLabel = formatMonthLabel(month);

  // Filter payload based on active tab
  const prefix = activeTab === 'timeline' ? 'balance_' : 'contribution_';
  const entries = payload.filter((p) => p.dataKey.startsWith(prefix));

  // Calculate total for stacked display
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div
      className="rounded-md shadow-lg text-xs max-w-64 overflow-hidden"
      style={{
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div className="px-3 py-2">
        <div className="font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          {monthLabel} {month.split('-')[0]}
        </div>

        {/* Individual stash values */}
        {entries.map((entry) => {
          const itemId = entry.dataKey.replace(prefix, '');
          const item = items.find((i) => i.id === itemId);
          return (
            <div key={entry.dataKey} className="flex justify-between items-center gap-3 mb-1">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span style={{ color: 'var(--monarch-text-muted)' }}>
                  {item?.name ?? 'Unknown'}
                </span>
              </div>
              <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                {activeTab === 'contributions' && entry.value >= 0 ? '+' : ''}
                {formatCurrency(entry.value)}
              </span>
            </div>
          );
        })}

        {/* Total */}
        {entries.length > 1 && (
          <div
            className="flex justify-between items-center gap-3 pt-1.5 mt-1.5"
            style={{ borderTop: `1px solid ${colors.border}` }}
          >
            <span style={{ color: 'var(--monarch-text-muted)' }}>
              {activeTab === 'timeline' ? 'Total' : 'Net change'}
            </span>
            <span
              className="font-medium"
              style={{
                color:
                  activeTab === 'contributions' && total >= 0
                    ? 'var(--monarch-success)'
                    : 'var(--monarch-text-dark)',
              }}
            >
              {activeTab === 'contributions' && total >= 0 ? '+' : ''}
              {formatCurrency(total)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function StashProgressChart({
  items,
  months,
  visibleStashIds,
  activeTab,
  formatCurrency,
}: StashProgressChartProps) {
  const colors = useChartColors();

  // Filter to visible items
  const visibleItems = useMemo(
    () => items.filter((item) => visibleStashIds.includes(item.id)),
    [items, visibleStashIds]
  );

  // Transform data for Recharts
  const chartData = useMemo((): ChartDataPoint[] => {
    return months.map((month) => {
      const point: ChartDataPoint = {
        month,
        monthLabel: formatMonthLabel(month),
        totalContribution: 0,
      };

      // Add balance and contribution for each visible stash
      for (const item of visibleItems) {
        const monthData = item.months.find((m) => m.month === month);
        point[`balance_${item.id}`] = monthData?.balance ?? 0;
        point[`contribution_${item.id}`] = monthData?.contribution ?? 0;
        point.totalContribution += monthData?.contribution ?? 0;
      }

      return point;
    });
  }, [months, visibleItems]);

  // Assign colors to stashes
  const stashColors = useMemo(() => {
    const colorMap: Record<string, string> = {};
    visibleItems.forEach((item, index) => {
      colorMap[item.id] = LINE_COLORS[index % LINE_COLORS.length]!;
    });
    return colorMap;
  }, [visibleItems]);

  // Calculate Y-axis domain for balances (timeline mode - stacked)
  const maxBalance = useMemo(() => {
    let max = 0;
    for (const point of chartData) {
      // For stacked areas, we need the sum of all balances at each point
      let stackedValue = 0;
      for (const item of visibleItems) {
        const value = point[`balance_${item.id}`];
        if (typeof value === 'number') {
          stackedValue += value;
        }
      }
      if (stackedValue > max) {
        max = stackedValue;
      }
    }
    return max;
  }, [chartData, visibleItems]);

  // Calculate Y-axis domain for contributions (contributions mode - stacked)
  const [minContribution, maxContribution] = useMemo(() => {
    let min = 0;
    let max = 0;
    for (const point of chartData) {
      // For stacked bars, we need the sum of all contributions at each point
      let stackedValue = 0;
      for (const item of visibleItems) {
        const value = point[`contribution_${item.id}`];
        if (typeof value === 'number') {
          stackedValue += value;
        }
      }
      if (stackedValue < min) min = stackedValue;
      if (stackedValue > max) max = stackedValue;
    }
    return [min, max];
  }, [chartData, visibleItems]);

  if (months.length === 0 || visibleItems.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-64 rounded-lg"
        style={{ backgroundColor: 'var(--monarch-bg-page)' }}
      >
        <p style={{ color: 'var(--monarch-text-muted)' }}>No data to display</p>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: 350 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <XAxis
            dataKey="monthLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: colors.textMuted }}
            dy={10}
          />

          {/* Single Y-axis (no more dual-axis confusion) */}
          <YAxis
            orientation="left"
            domain={
              activeTab === 'timeline'
                ? [0, maxBalance * 1.1]
                : [minContribution * 1.2, maxContribution * 1.2]
            }
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: colors.textMuted }}
            tickFormatter={(value) =>
              activeTab === 'contributions' && value >= 0
                ? `+${formatCurrency(value)}`
                : formatCurrency(value)
            }
            width={60}
          />

          <RechartsTooltip
            content={
              <CustomTooltip
                items={items}
                formatCurrency={formatCurrency}
                colors={colors}
                activeTab={activeTab}
              />
            }
            cursor={{ stroke: colors.border, strokeDasharray: '3 3' }}
            wrapperStyle={{ zIndex: Z_INDEX.TOOLTIP }}
          />

          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ paddingTop: '12px' }}
            content={<CustomLegend items={items} stashColors={stashColors} />}
          />

          {/* Timeline tab: Stacked areas showing cumulative balance composition */}
          {activeTab === 'timeline' &&
            visibleItems.map((item) => {
              const color = stashColors[item.id] ?? LINE_COLORS[0]!;
              return (
                <Area
                  key={item.id}
                  type="monotone"
                  dataKey={`balance_${item.id}`}
                  stackId="stash"
                  fill={color}
                  stroke={color}
                  fillOpacity={0.6}
                />
              );
            })}

          {/* Contributions tab: Stacked bars showing contribution breakdown */}
          {activeTab === 'contributions' &&
            visibleItems.map((item) => {
              const color = stashColors[item.id] ?? LINE_COLORS[0]!;
              return (
                <Bar
                  key={item.id}
                  dataKey={`contribution_${item.id}`}
                  stackId="contribution"
                  fill={color}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={60}
                />
              );
            })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
