/**
 * RecurringToolHeader - Header section for the Recurring Tool settings card
 */

import { Repeat, ChevronRight } from 'lucide-react';

interface RecurringToolHeaderProps {
  readonly hasAnythingToReset: boolean;
  readonly totalCategories: number;
  readonly totalItems: number;
  readonly onNavigate: () => void;
}

export function RecurringToolHeader({
  hasAnythingToReset,
  totalCategories,
  totalItems,
  onNavigate,
}: RecurringToolHeaderProps) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-4">
        <div
          className="p-2.5 rounded-lg shrink-0"
          style={{ backgroundColor: hasAnythingToReset ? 'var(--monarch-orange-light)' : 'var(--monarch-bg-page)' }}
        >
          <Repeat size={20} style={{ color: hasAnythingToReset ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium flex items-center gap-2" style={{ color: 'var(--monarch-text-dark)' }}>
            Recurring Tool
            {hasAnythingToReset && (
              <span
                className="px-2 py-0.5 text-xs font-medium rounded-full"
                style={{ backgroundColor: 'var(--monarch-success-bg)', color: 'var(--monarch-success)' }}
              >
                Active
              </span>
            )}
          </div>
          <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
            {hasAnythingToReset ? (
              <span className="flex items-center gap-3">
                <span>{totalCategories} {totalCategories === 1 ? 'category' : 'categories'}</span>
                <span style={{ color: 'var(--monarch-border)' }}>|</span>
                <span>{totalItems} tracked {totalItems === 1 ? 'item' : 'items'}</span>
              </span>
            ) : (
              'Not configured'
            )}
          </div>
        </div>

        <button
          type="button"
          className="p-2 rounded-lg shrink-0 hover-bg-transparent-to-hover"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={onNavigate}
          aria-label="Go to Recurring tool"
        >
          <ChevronRight size={20} style={{ color: 'var(--monarch-text-muted)' }} />
        </button>
      </div>
    </div>
  );
}
