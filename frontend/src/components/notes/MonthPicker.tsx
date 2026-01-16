/**
 * Month Picker
 *
 * Modal for selecting a month with unlimited range.
 * Shows a year selector and month grid.
 */

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Portal } from '../Portal';
import type { MonthKey } from '../../types/notes';

interface MonthPickerProps {
  /** Currently selected month */
  currentMonth: MonthKey;
  /** Callback when a month is selected */
  onSelect: (month: MonthKey) => void;
  /** Callback to close the picker */
  onClose: () => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Parse month key to get year and month
 */
function parseMonthKey(monthKey: MonthKey): { year: number; month: number } {
  const parts = monthKey.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  return { year, month };
}

/**
 * Format year and month to month key
 */
function formatMonthKey(year: number, month: number): MonthKey {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Get current month key
 */
function getCurrentMonthKey(): MonthKey {
  const now = new Date();
  return formatMonthKey(now.getFullYear(), now.getMonth() + 1);
}

export function MonthPicker({ currentMonth, onSelect, onClose }: MonthPickerProps) {
  const { year: selectedYear, month: selectedMonth } = parseMonthKey(currentMonth);
  const [displayYear, setDisplayYear] = useState(selectedYear);
  const modalRef = useRef<HTMLDivElement>(null);

  const currentKey = getCurrentMonthKey();
  const { year: currentYear, month: currentMonthNum } = parseMonthKey(currentKey);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handlePrevYear = () => setDisplayYear((y) => y - 1);
  const handleNextYear = () => setDisplayYear((y) => y + 1);

  const handleMonthClick = (monthIndex: number) => {
    onSelect(formatMonthKey(displayYear, monthIndex + 1));
  };

  const handleGoToToday = () => {
    setDisplayYear(currentYear);
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ zIndex: 'var(--z-index-modal)', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      >
        <div
          ref={modalRef}
          className="rounded-xl shadow-lg p-4 w-80"
          style={{ backgroundColor: 'var(--monarch-bg-card)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Select month"
        >
          {/* Header with year navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevYear}
              className="p-1.5 rounded hover:bg-(--monarch-bg-hover) transition-colors icon-btn-hover"
              aria-label="Previous year"
            >
              <ChevronLeft size={20} style={{ color: 'var(--monarch-text-muted)' }} />
            </button>

            <button
              type="button"
              onClick={handleGoToToday}
              className="text-lg font-semibold hover:opacity-80 transition-opacity"
              style={{ color: 'var(--monarch-text-dark)' }}
              aria-label={`Year ${displayYear}. Click to go to current year.`}
            >
              {displayYear}
            </button>

            <button
              type="button"
              onClick={handleNextYear}
              className="p-1.5 rounded hover:bg-(--monarch-bg-hover) transition-colors icon-btn-hover"
              aria-label="Next year"
            >
              <ChevronRight size={20} style={{ color: 'var(--monarch-text-muted)' }} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-(--monarch-bg-hover) transition-colors ml-2"
              aria-label="Close month picker"
            >
              <X size={18} style={{ color: 'var(--monarch-text-muted)' }} />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((monthName, index) => {
              const monthNum = index + 1;
              const isSelected = displayYear === selectedYear && monthNum === selectedMonth;
              const isCurrent = displayYear === currentYear && monthNum === currentMonthNum;

              let buttonClassName =
                'py-2 px-3 text-sm font-medium rounded-lg transition-colors list-item-enter';
              if (isSelected) {
                buttonClassName += ' text-white';
              } else if (isCurrent) {
                buttonClassName += ' ring-1 ring-inset';
              } else {
                buttonClassName += ' hover:bg-(--monarch-bg-hover)';
              }

              const backgroundColor = isSelected ? 'var(--monarch-orange)' : 'transparent';
              const textColor = isSelected ? 'white' : 'var(--monarch-text-dark)';
              const ringColor = isCurrent && !isSelected ? 'var(--monarch-orange)' : undefined;

              return (
                <button
                  key={monthName}
                  type="button"
                  onClick={() => handleMonthClick(index)}
                  className={buttonClassName}
                  style={
                    {
                      backgroundColor,
                      color: textColor,
                      '--tw-ring-color': ringColor,
                      animationDelay: `${index * 25}ms`,
                    } as React.CSSProperties
                  }
                  aria-pressed={isSelected}
                  aria-current={isCurrent ? 'date' : undefined}
                >
                  {monthName}
                </button>
              );
            })}
          </div>

          {/* Quick jump to current month */}
          <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
            <button
              type="button"
              onClick={() => onSelect(currentKey)}
              className="w-full py-2 text-sm font-medium rounded-lg hover:bg-(--monarch-bg-hover) transition-colors"
              style={{ color: 'var(--monarch-orange)' }}
            >
              Go to Current Month
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
