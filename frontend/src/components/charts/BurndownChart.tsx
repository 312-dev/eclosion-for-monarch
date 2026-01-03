/**
 * BurndownChart - Monthly savings target burndown visualization
 *
 * Shows how monthly contribution will decrease as catch-up payments complete.
 */

import { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Area } from 'recharts';
import { Portal } from '../Portal';
import { Z_INDEX } from '../../constants';
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
          <div>Paid / resets:</div>
          {data.completingItems.map((item, i) => (
            <div key={i}>- {item}</div>
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

  // Only enable horizontal scroll for charts with many data points
  const minChartWidth = data.length * 70;
  const needsScroll = data.length > 12;

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
