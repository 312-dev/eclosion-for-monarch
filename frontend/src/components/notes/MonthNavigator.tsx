/**
 * Month Navigator
 *
 * Monarch-inspired navigation bar with month display, tabs, and navigation arrows.
 * Supports unlimited month range navigation.
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MonthPicker } from './MonthPicker';
import type { MonthKey } from '../../types/notes';

interface MonthNavigatorProps {
  /** Current month being viewed */
  currentMonth: MonthKey;
  /** Callback when month changes */
  onMonthChange: (month: MonthKey) => void;
  /** Current active tab */
  activeTab: 'notes' | 'reader';
  /** Callback when tab changes */
  onTabChange: (tab: 'notes' | 'reader') => void;
}

/**
 * Parse month key to Date object
 */
function parseMonthKey(monthKey: MonthKey): Date {
  const parts = monthKey.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  return new Date(year, month - 1, 1);
}

/**
 * Format Date to month key
 */
function formatMonthKey(date: Date): MonthKey {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Format month for display (e.g., "January 2026")
 */
function formatMonthDisplay(monthKey: MonthKey): string {
  const date = parseMonthKey(monthKey);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Get current month key
 */
function getCurrentMonthKey(): MonthKey {
  return formatMonthKey(new Date());
}

export function MonthNavigator({
  currentMonth,
  onMonthChange,
  activeTab,
  onTabChange,
}: MonthNavigatorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handlePrevMonth = () => {
    const date = parseMonthKey(currentMonth);
    date.setMonth(date.getMonth() - 1);
    onMonthChange(formatMonthKey(date));
  };

  const handleNextMonth = () => {
    const date = parseMonthKey(currentMonth);
    date.setMonth(date.getMonth() + 1);
    onMonthChange(formatMonthKey(date));
  };

  const handleToday = () => {
    onMonthChange(getCurrentMonthKey());
  };

  const isCurrentMonth = currentMonth === getCurrentMonthKey();

  return (
    <div
      className="flex items-center justify-between gap-4 pb-4 border-b"
      style={{ borderColor: 'var(--monarch-border)' }}
    >
      {/* Left: Month display and tabs */}
      <div className="flex items-center gap-6">
        {/* Month display - clickable to open picker */}
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className="text-lg font-semibold hover:opacity-80 transition-opacity"
          style={{ color: 'var(--monarch-text-dark)' }}
          aria-label={`Current month: ${formatMonthDisplay(currentMonth)}. Click to select a different month.`}
        >
          {formatMonthDisplay(currentMonth)}
        </button>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onTabChange('notes')}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'notes' ? '' : 'hover:opacity-80'
            }`}
            style={{
              color: activeTab === 'notes' ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)',
              borderColor: activeTab === 'notes' ? 'var(--monarch-orange)' : 'transparent',
            }}
            aria-pressed={activeTab === 'notes'}
          >
            Notes
          </button>
          <button
            type="button"
            onClick={() => onTabChange('reader')}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'reader' ? '' : 'hover:opacity-80'
            }`}
            style={{
              color: activeTab === 'reader' ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)',
              borderColor: activeTab === 'reader' ? 'var(--monarch-orange)' : 'transparent',
            }}
            aria-pressed={activeTab === 'reader'}
          >
            Reader
          </button>
        </div>
      </div>

      {/* Right: Navigation arrows and Today button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded hover:bg-(--monarch-bg-hover) transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} style={{ color: 'var(--monarch-text-muted)' }} />
        </button>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 rounded hover:bg-(--monarch-bg-hover) transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={20} style={{ color: 'var(--monarch-text-muted)' }} />
        </button>
        <button
          type="button"
          onClick={handleToday}
          disabled={isCurrentMonth}
          className={`px-3 py-1 text-sm font-medium rounded-full border transition-colors ${
            isCurrentMonth ? 'opacity-50 cursor-not-allowed' : 'hover:bg-(--monarch-bg-hover)'
          }`}
          style={{
            borderColor: 'var(--monarch-border)',
            color: 'var(--monarch-text-dark)',
          }}
          aria-label="Go to current month"
        >
          Today
        </button>
      </div>

      {/* Month Picker Modal */}
      {isPickerOpen && (
        <MonthPicker
          currentMonth={currentMonth}
          onSelect={(month) => {
            onMonthChange(month);
            setIsPickerOpen(false);
          }}
          onClose={() => setIsPickerOpen(false)}
        />
      )}
    </div>
  );
}
