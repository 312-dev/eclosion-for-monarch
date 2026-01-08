/**
 * BurndownChart - Stabilization point visualization
 *
 * Shows the path to monthly rate stabilization - when all catch-up payments
 * complete and costs reach their steady-state minimum.
 *
 * Note: Over-contributing is NOT factored into this projection.
 */

import { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Area } from 'recharts';
import { Portal } from '../Portal';
import { Z_INDEX } from '../../constants';
import { AnchorIcon } from '../icons';
import type { BurndownPoint } from './burndownUtils';

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
  data: BurndownPoint[];
}

// Store chart rect ref at module level so Portal-rendered tooltip can access it
let chartRectCache: DOMRect | null = null;

function CustomTooltip({ active, payload, formatCurrency, coordinate, data }: CustomTooltipProps) {
  const firstPayload = payload?.[0];
  if (!active || !firstPayload || !coordinate || !chartRectCache) return null;

  const point = firstPayload.payload;
  const chartRect = chartRectCache;
  const tooltipWidth = 280;
  const tooltipHeight = 120;

  // Find the stabilization point - the last month where catch-up payments complete
  const stabilizationIndex = data.reduce((lastIdx, p, i) => p.hasChange ? i : lastIdx, -1);
  const currentIndex = data.findIndex(p => p.fullLabel === point.fullLabel);
  const isStabilizationPoint = currentIndex === stabilizationIndex && stabilizationIndex !== -1;

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

  // Generate explanation based on completing items
  let explanation = '';
  if (point.completingItems.length > 0) {
    const names = point.completingItems.slice(0, 3);
    if (point.completingItems.length > 3) {
      explanation = `${names.join(', ')} and ${point.completingItems.length - 3} more complete catch-up`;
    } else {
      explanation = `${names.join(', ')} ${names.length === 1 ? 'completes' : 'complete'} catch-up`;
    }
  } else {
    explanation = 'Monthly contribution rate';
  }

  return (
    <Portal>
      <div
        className="rounded-md shadow-lg text-xs max-w-70 overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          position: 'fixed',
          top,
          left,
          zIndex: Z_INDEX.TOOLTIP,
          pointerEvents: 'none',
        }}
      >
        {isStabilizationPoint && (
          <div
            className="px-3 py-1.5 text-[11px] font-medium"
            style={{
              backgroundColor: 'var(--monarch-success)',
              color: 'white',
            }}
          >
            Stabilization point achieved. All caught up.
          </div>
        )}
        <div className="px-3 py-2">
          <div className="flex justify-between items-baseline gap-3 mb-1.5">
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              {point.fullLabel}
            </div>
            <div className="font-semibold" style={{ color: 'var(--monarch-success)' }}>
              {formatCurrency(point.amount, { maximumFractionDigits: 0 })}/mo
            </div>
          </div>
          {point.rollupAmount > 0 && (
            <div className="text-[10px] mb-1.5" style={{ color: 'var(--monarch-text-muted)' }}>
              incl. {formatCurrency(point.rollupAmount, { maximumFractionDigits: 0 })} rollup
            </div>
          )}
          <div
            className="text-[11px] leading-relaxed"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            {isStabilizationPoint
              ? 'Your steady-state monthly rate going forward'
              : explanation}
          </div>
        </div>
      </div>
    </Portal>
  );
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Update chart rect cache on mouse interaction so tooltip can calculate position
  const updateChartRect = () => {
    if (containerRef.current) {
      const wrapper = containerRef.current.querySelector('.recharts-wrapper');
      if (wrapper) {
        chartRectCache = wrapper.getBoundingClientRect();
      }
    }
  };

  if (data.length < 2) return null;

  const minAmount = Math.min(...data.map(d => d.amount));
  const maxAmount = Math.max(...data.map(d => d.amount));
  // Add some padding to the domain
  const range = maxAmount - minAmount;
  const padding = range > 0 ? range * 0.15 : maxAmount * 0.02;

  // Only enable horizontal scroll for charts with many data points
  const minChartWidth = data.length * 70;
  const needsScroll = data.length > 12;

  return (
    <div
      ref={containerRef}
      className="mt-3"
      onMouseMove={updateChartRect}
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
                <stop offset="0%" stopColor={colors.success} stopOpacity={0.15} />
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
              content={<CustomTooltip formatCurrency={formatCurrency} data={data} />}
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
              dot={({ cx, cy, index }) => {
                const isEndpoint = index === 0 || index === data.length - 1;
                const point = data[index];
                const hasChange = point?.hasChange ?? false;

                // Find the stabilization point - the last month where catch-up payments complete
                const stabilizationIndex = data.reduce((lastIdx, p, i) => p.hasChange ? i : lastIdx, -1);
                const isStabilizationPoint = index === stabilizationIndex;

                // Use anchor icon for the stabilization point
                if (isStabilizationPoint && cx !== undefined && cy !== undefined) {
                  const size = 20;

                  return (
                    <g key={index}>
                      {/* Background circle to prevent line intersection */}
                      <circle cx={cx} cy={cy} r={14} fill={colors.bgCard} />
                      <foreignObject x={cx - size / 2} y={cy - size / 2} width={size} height={size}>
                        <AnchorIcon size={size} color={colors.success} strokeWidth={2.5} />
                      </foreignObject>
                    </g>
                  );
                }

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
              activeDot={({ cx, cy, index }) => {
                // Find the stabilization point - the last month where catch-up payments complete
                const stabilizationIndex = data.reduce((lastIdx, p, i) => p.hasChange ? i : lastIdx, -1);
                const isStabilizationPoint = index === stabilizationIndex;

                if (isStabilizationPoint && cx !== undefined && cy !== undefined) {
                  const size = 22;

                  return (
                    <g key={`active-${index}`}>
                      <circle cx={cx} cy={cy} r={16} fill={colors.bgCard} />
                      <foreignObject x={cx - size / 2} y={cy - size / 2} width={size} height={size}>
                        <AnchorIcon size={size} color={colors.success} strokeWidth={2.5} />
                      </foreignObject>
                    </g>
                  );
                }

                return (
                  <circle
                    key={`active-${index}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={colors.success}
                    stroke={colors.success}
                  />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
