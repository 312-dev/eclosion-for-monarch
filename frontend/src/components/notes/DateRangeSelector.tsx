/**
 * Date Range Selector
 *
 * A traditional date range picker with preset options and visual month selection.
 * Supports common presets (This Month, Last 3 Months, etc.) and custom range selection.
 */

import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  MONTH_NAMES,
  formatMonthKey,
  parseMonthKey,
  getCurrentMonthKey,
  createDateRangePresets,
  detectActivePreset,
  formatMonthDisplay,
  type DateRangePreset,
} from '../../utils/dateRangeUtils';
import type { MonthKey } from '../../types/notes';

interface DateRangeSelectorProps {
  /** Start month of the range */
  startMonth: MonthKey;
  /** End month of the range */
  endMonth: MonthKey;
  /** Callback when start month changes */
  onStartChange: (month: MonthKey) => void;
  /** Callback when end month changes */
  onEndChange: (month: MonthKey) => void;
}

export function DateRangeSelector({
  startMonth,
  endMonth,
  onStartChange,
  onEndChange,
}: Readonly<DateRangeSelectorProps>) {
  const presets = useMemo(() => createDateRangePresets(), []);
  const activePreset = useMemo(
    () => detectActivePreset(startMonth, endMonth, presets),
    [startMonth, endMonth, presets]
  );

  // Year display for the calendar grid
  const { year: startYear } = parseMonthKey(startMonth);
  const [displayYear, setDisplayYear] = useState(startYear);

  // Selection mode: null means no active selection, 'start' or 'end' means actively selecting
  const [selectionMode, setSelectionMode] = useState<'start' | 'end' | null>(null);

  const handlePresetClick = useCallback(
    (preset: DateRangePreset) => {
      if (preset.id === 'custom') {
        // Just mark as custom mode, user will pick from calendar
        return;
      }
      const { start, end } = preset.getRange();
      onStartChange(start);
      onEndChange(end);
      setDisplayYear(parseMonthKey(start).year);
      setSelectionMode(null);
    },
    [onStartChange, onEndChange]
  );

  const handleMonthClick = useCallback(
    (year: number, monthNum: number) => {
      const clickedMonth = formatMonthKey(year, monthNum);

      if (selectionMode === 'start' || selectionMode === null) {
        // Starting a new selection or selecting start
        onStartChange(clickedMonth);
        if (clickedMonth > endMonth) {
          onEndChange(clickedMonth);
        }
        setSelectionMode('end');
      } else {
        // Selecting end
        if (clickedMonth >= startMonth) {
          onEndChange(clickedMonth);
        } else {
          // Clicked before start, swap
          onEndChange(startMonth);
          onStartChange(clickedMonth);
        }
        setSelectionMode(null);
      }
    },
    [selectionMode, startMonth, endMonth, onStartChange, onEndChange]
  );

  const handlePrevYear = () => setDisplayYear((y) => y - 1);
  const handleNextYear = () => setDisplayYear((y) => y + 1);

  const currentMonthKey = getCurrentMonthKey();
  const { year: currentYear, month: currentMonthNum } = parseMonthKey(currentMonthKey);

  // Check if a month is in the selected range
  const isInRange = (year: number, monthNum: number): boolean => {
    const monthKey = formatMonthKey(year, monthNum);
    return monthKey >= startMonth && monthKey <= endMonth;
  };

  const isStart = (year: number, monthNum: number): boolean => {
    return formatMonthKey(year, monthNum) === startMonth;
  };

  const isEnd = (year: number, monthNum: number): boolean => {
    return formatMonthKey(year, monthNum) === endMonth;
  };

  return (
    <div className="space-y-3">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handlePresetClick(preset)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              activePreset === preset.id ? 'text-white' : 'hover:bg-(--monarch-bg-hover)'
            }`}
            style={{
              backgroundColor:
                activePreset === preset.id ? 'var(--monarch-orange)' : 'var(--monarch-bg-page)',
              color: activePreset === preset.id ? 'white' : 'var(--monarch-text-dark)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Selected range display */}
      <div
        className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm"
        style={{ backgroundColor: 'var(--monarch-bg-page)' }}
      >
        <button
          type="button"
          onClick={() => setSelectionMode('start')}
          className={`px-3 py-1 rounded font-medium transition-colors ${
            selectionMode === 'start' ? 'ring-2' : ''
          }`}
          style={
            {
              backgroundColor: 'var(--monarch-bg-card)',
              color: 'var(--monarch-text-dark)',
              border: '1px solid var(--monarch-border)',
              '--tw-ring-color': 'var(--monarch-orange)',
            } as React.CSSProperties
          }
        >
          {formatMonthDisplay(startMonth)}
        </button>
        <span style={{ color: 'var(--monarch-text-muted)' }}>→</span>
        <button
          type="button"
          onClick={() => setSelectionMode('end')}
          className={`px-3 py-1 rounded font-medium transition-colors ${
            selectionMode === 'end' ? 'ring-2' : ''
          }`}
          style={
            {
              backgroundColor: 'var(--monarch-bg-card)',
              color: 'var(--monarch-text-dark)',
              border: '1px solid var(--monarch-border)',
              '--tw-ring-color': 'var(--monarch-orange)',
            } as React.CSSProperties
          }
        >
          {formatMonthDisplay(endMonth)}
        </button>
      </div>

      {/* Calendar grid */}
      <div
        className="rounded-lg p-3"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        {/* Year navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handlePrevYear}
            className="p-1 rounded hover:bg-(--monarch-bg-hover) transition-colors"
            aria-label="Previous year"
          >
            <ChevronLeft size={18} style={{ color: 'var(--monarch-text-muted)' }} />
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
            {displayYear}
          </span>
          <button
            type="button"
            onClick={handleNextYear}
            className="p-1 rounded hover:bg-(--monarch-bg-hover) transition-colors"
            aria-label="Next year"
          >
            <ChevronRight size={18} style={{ color: 'var(--monarch-text-muted)' }} />
          </button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-4 gap-1">
          {MONTH_NAMES.map((monthName, index) => {
            const monthNum = index + 1;
            const inRange = isInRange(displayYear, monthNum);
            const isStartMonth = isStart(displayYear, monthNum);
            const isEndMonth = isEnd(displayYear, monthNum);
            const isCurrent = displayYear === currentYear && monthNum === currentMonthNum;
            const isRangeEnd = isStartMonth || isEndMonth;

            // Determine background color based on selection state
            let backgroundColor = 'transparent';
            if (isRangeEnd) {
              backgroundColor = 'var(--monarch-orange)';
            } else if (inRange) {
              backgroundColor = 'var(--monarch-orange-light)';
            }

            // Determine text color based on selection state
            let textColor = 'var(--monarch-text-dark)';
            if (isRangeEnd) {
              textColor = 'white';
            } else if (inRange) {
              textColor = 'var(--monarch-orange)';
            }

            return (
              <button
                key={monthName}
                type="button"
                onClick={() => handleMonthClick(displayYear, monthNum)}
                className={`py-1.5 px-2 text-xs font-medium rounded transition-colors ${
                  isCurrent && !isRangeEnd ? 'ring-1 ring-inset' : ''
                }`}
                style={
                  {
                    backgroundColor,
                    color: textColor,
                    '--tw-ring-color': 'var(--monarch-orange)',
                  } as React.CSSProperties
                }
              >
                {monthName}
              </button>
            );
          })}
        </div>

        {/* Hint text */}
        {selectionMode && (
          <div className="mt-2 text-xs text-center" style={{ color: 'var(--monarch-text-muted)' }}>
            {selectionMode === 'start'
              ? 'Click a month to set the start date'
              : 'Click a month to set the end date'}
          </div>
        )}
      </div>
    </div>
  );
}
