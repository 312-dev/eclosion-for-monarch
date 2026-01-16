/**
 * Month Year Selector
 *
 * Styled navigation bar with month display and navigation arrows.
 * Features a subtle card design with accent styling.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';
import {
  parseMonthKey,
  formatMonthKey,
  getCurrentMonthKey,
  navigateMonth,
  getMonthDifference,
  calculateYearRange,
} from '../../utils/dateRangeUtils';
import type { MonthKey } from '../../types/notes';

interface MonthYearSelectorProps {
  readonly currentMonth: MonthKey;
  readonly onMonthChange: (month: MonthKey) => void;
  readonly yearsWithNotes?: readonly number[];
  readonly minYearRange?: number;
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export function MonthYearSelector({
  currentMonth,
  onMonthChange,
  yearsWithNotes = [],
  minYearRange = 1,
}: MonthYearSelectorProps) {
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const monthRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  const { year: selectedYear, month: selectedMonth } = parseMonthKey(currentMonth);
  const currentYear = new Date().getFullYear();
  const currentMonthKey = getCurrentMonthKey();
  const isCurrentMonth = currentMonth === currentMonthKey;
  const monthDiff = getMonthDifference(currentMonthKey, currentMonth);

  const availableYears = calculateYearRange(currentYear, yearsWithNotes, minYearRange);
  const selectedMonthData = MONTHS.find((m) => m.value === selectedMonth);

  // Close dropdowns on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthRef.current && !monthRef.current.contains(e.target as Node)) setIsMonthOpen(false);
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) setIsYearOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMonthOpen(false);
        setIsYearOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handlePrevMonth = () => onMonthChange(navigateMonth(currentMonth, -1));
  const handleNextMonth = () => onMonthChange(navigateMonth(currentMonth, 1));
  const handleGoToToday = () => onMonthChange(currentMonthKey);

  const handleMonthSelect = (month: number) => {
    onMonthChange(formatMonthKey(selectedYear, month));
    setIsMonthOpen(false);
  };
  const handleYearSelect = (year: number) => {
    onMonthChange(formatMonthKey(year, selectedMonth));
    setIsYearOpen(false);
  };

  // Format relative time indicator
  const relativeLabel = (() => {
    if (isCurrentMonth) return null;
    const abs = Math.abs(monthDiff);
    const dir = monthDiff > 0 ? 'ahead' : 'ago';
    if (abs === 1) {
      const singleMonthLabel = monthDiff > 0 ? 'Next month' : 'Last month';
      return singleMonthLabel;
    }
    if (abs < 12) {
      return `${abs} months ${dir}`;
    }
    const y = Math.floor(abs / 12);
    const m = abs % 12;
    if (m === 0) {
      const yearLabel = y === 1 ? 'year' : 'years';
      return `${y} ${yearLabel} ${dir}`;
    }
    return `${y}y ${m}m ${dir}`;
  })();

  return (
    <div
      className="flex-1 pb-4 mb-2"
      style={{ borderBottom: '1px solid var(--monarch-border)' }}
      data-tour="month-navigator"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl"
            style={{ backgroundColor: 'var(--monarch-orange-light)' }}
          >
            <Calendar size={20} style={{ color: 'var(--monarch-orange)' }} />
          </div>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-lg hover:bg-(--monarch-bg-hover) transition-colors icon-btn-hover"
            aria-label="Previous month"
          >
            <ChevronLeft size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          </button>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <div ref={monthRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsMonthOpen(!isMonthOpen);
                  setIsYearOpen(false);
                }}
                className="text-xl font-semibold cursor-pointer hover:opacity-70 transition-opacity"
                style={{ color: 'var(--monarch-text-dark)' }}
                aria-expanded={isMonthOpen}
                aria-haspopup="menu"
                aria-label={`Month: ${selectedMonthData?.label}. Click to change.`}
              >
                {selectedMonthData?.label}
              </button>

              {/* Month dropdown */}
              {isMonthOpen && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1 py-1 rounded-lg shadow-lg min-w-35"
                  style={{
                    backgroundColor: 'var(--monarch-bg-card)',
                    border: '1px solid var(--monarch-border)',
                    zIndex: 'var(--z-index-dropdown)',
                  }}
                  role="menu"
                  aria-label="Select month"
                >
                  {MONTHS.map((month) => {
                    const isSelected = month.value === selectedMonth;
                    const isCurrent =
                      month.value === new Date().getMonth() + 1 && selectedYear === currentYear;

                    return (
                      <button
                        key={month.value}
                        type="button"
                        role="menuitem"
                        onClick={() => handleMonthSelect(month.value)}
                        className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                          isSelected ? 'font-medium' : ''
                        } hover:bg-(--monarch-bg-hover)`}
                        style={{
                          color: isSelected ? 'var(--monarch-orange)' : 'var(--monarch-text-dark)',
                          backgroundColor: isSelected
                            ? 'var(--monarch-orange-light)'
                            : 'transparent',
                        }}
                        aria-current={isSelected ? 'true' : undefined}
                      >
                        {month.label}
                        {isCurrent && !isSelected && (
                          <span
                            className="ml-2 text-xs"
                            style={{ color: 'var(--monarch-text-muted)' }}
                          >
                            (current)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Year selector */}
            <div ref={yearRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsYearOpen(!isYearOpen);
                  setIsMonthOpen(false);
                }}
                className="text-xl font-semibold cursor-pointer hover:opacity-70 transition-opacity"
                style={{ color: 'var(--monarch-text-dark)' }}
                aria-expanded={isYearOpen}
                aria-haspopup="menu"
                aria-label={`Year: ${selectedYear}. Click to change.`}
              >
                {selectedYear}
              </button>

              {/* Year dropdown */}
              {isYearOpen && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1 py-1 rounded-lg shadow-lg min-w-25 max-h-50 overflow-y-auto"
                  style={{
                    backgroundColor: 'var(--monarch-bg-card)',
                    border: '1px solid var(--monarch-border)',
                    zIndex: 'var(--z-index-dropdown)',
                  }}
                  role="menu"
                  aria-label="Select year"
                >
                  {availableYears.map((year) => {
                    const isSelected = year === selectedYear;
                    const isCurrent = year === currentYear;

                    return (
                      <button
                        key={year}
                        type="button"
                        role="menuitem"
                        onClick={() => handleYearSelect(year)}
                        className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                          isSelected ? 'font-medium' : ''
                        } hover:bg-(--monarch-bg-hover)`}
                        style={{
                          color: isSelected ? 'var(--monarch-orange)' : 'var(--monarch-text-dark)',
                          backgroundColor: isSelected
                            ? 'var(--monarch-orange-light)'
                            : 'transparent',
                        }}
                        aria-current={isSelected ? 'true' : undefined}
                      >
                        {year}
                        {isCurrent && !isSelected && (
                          <span
                            className="ml-2 text-xs"
                            style={{ color: 'var(--monarch-text-muted)' }}
                          >
                            (current)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Relative time indicator or current month badge */}
          {(() => {
            if (isCurrentMonth) {
              return (
                <span
                  className="mt-1 px-2 py-0.5 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: 'var(--monarch-success-bg)',
                    color: 'var(--monarch-success)',
                  }}
                >
                  Current Month
                </span>
              );
            }
            if (relativeLabel) {
              return (
                <button
                  type="button"
                  onClick={handleGoToToday}
                  className="mt-1 flex items-center gap-1 px-2 py-0.5 text-xs rounded-full hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: 'var(--monarch-bg-page)',
                    color: 'var(--monarch-text-muted)',
                  }}
                  aria-label={`${relativeLabel}. Click to return to current month.`}
                >
                  <RotateCcw size={10} />
                  {relativeLabel}
                </button>
              );
            }
            return null;
          })()}
        </div>

        {/* Right: Nav arrow and spacer to balance calendar icon */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-lg hover:bg-(--monarch-bg-hover) transition-colors icon-btn-hover"
            aria-label="Next month"
          >
            <ChevronRight size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          </button>
          <div className="w-11.25" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
