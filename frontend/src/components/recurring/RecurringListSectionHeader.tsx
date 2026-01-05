/**
 * RecurringListSectionHeader - Header for the recurring list section
 */

import { Eye, EyeOff } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface RecurringListSectionHeaderProps {
  readonly enabledCount: number;
  readonly disabledCount: number;
  readonly hideDisabled: boolean;
  readonly onToggleHide: () => void;
}

export function RecurringListSectionHeader({
  enabledCount,
  disabledCount,
  hideDisabled,
  onToggleHide,
}: RecurringListSectionHeaderProps) {
  return (
    <div className="px-5 py-4 flex items-center justify-between bg-monarch-bg-card border-b border-monarch-border">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-monarch-text-dark">
            Dedicated Categories
          </span>
          <span className="text-xs text-monarch-text-muted">
            ({enabledCount})
          </span>
        </div>
        <span className="text-sm text-monarch-text-light">
          Larger recurring transactions that get their own budget category for better tracking
        </span>
      </div>
      <div className="flex items-center gap-4">
        {disabledCount > 0 && (
          <Tooltip content={hideDisabled ? `Show ${disabledCount} untracked` : `Hide ${disabledCount} untracked`}>
            <button
              onClick={onToggleHide}
              className="p-1.5 rounded-md transition-colors text-monarch-text-muted hover:bg-monarch-bg-elevated"
            >
              {hideDisabled ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
