/**
 * ActionsDropdown - Actions dropdown menu for recurring items
 */

import type { RecurringItem } from '../../types';
import { useDropdown } from '../../hooks';
import { Tooltip } from '../Tooltip';

export interface ActionsDropdownProps {
  readonly item: RecurringItem;
  readonly onToggle: () => void;
  readonly onLinkCategory: () => void;
  readonly onRecreate: () => void;
  readonly onAddToRollup: (() => void) | undefined;
  readonly onRefresh: () => void;
  readonly isToggling: boolean;
  readonly isRecreating: boolean;
  readonly isAddingToRollup: boolean;
  readonly isRefreshing: boolean;
}

export function ActionsDropdown({
  item,
  onToggle,
  onLinkCategory,
  onRecreate,
  onAddToRollup,
  onRefresh,
  isToggling,
  isRecreating,
  isAddingToRollup,
  isRefreshing,
}: ActionsDropdownProps) {
  const dropdown = useDropdown<HTMLDivElement, HTMLButtonElement>({
    alignment: 'right',
    offset: { y: 4 },
  });

  const isLoading = isToggling || isRecreating || isAddingToRollup || isRefreshing;

  const handleToggle = () => {
    if (!isLoading) {
      dropdown.toggle();
    }
  };

  const handleAction = (action: () => void) => {
    dropdown.close();
    action();
  };

  return (
    <div className="relative">
      <Tooltip content="Actions">
        <button
          ref={dropdown.triggerRef}
          onClick={handleToggle}
          disabled={isLoading}
          className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/10 disabled:opacity-50"
        >
          {isLoading ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-text-muted)" strokeWidth="2">
              <circle cx="12" cy="12" r="1" fill="currentColor" />
              <circle cx="12" cy="5" r="1" fill="currentColor" />
              <circle cx="12" cy="19" r="1" fill="currentColor" />
            </svg>
          )}
        </button>
      </Tooltip>

      {dropdown.isOpen && (
        <div
          ref={dropdown.dropdownRef}
          className="fixed z-dropdown py-1 rounded-lg shadow-lg text-sm min-w-[180px] dropdown-menu"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            top: dropdown.position.top,
            right: dropdown.position.right,
          }}
        >
          {/* Enable/Disable */}
          <button
            onClick={() => handleAction(onToggle)}
            className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            {item.is_enabled ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                Untrack
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--monarch-success)">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
                Track
              </>
            )}
          </button>

          {/* Link to category - only for disabled items */}
          {!item.is_enabled && (
            <button
              onClick={() => handleAction(onLinkCategory)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors"
              style={{ color: 'var(--monarch-orange)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Link to existing category
            </button>
          )}

          {/* Recreate category - only when category is missing */}
          {item.is_enabled && item.category_missing && (
            <button
              onClick={() => handleAction(onRecreate)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors"
              style={{ color: 'var(--monarch-warning)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Recreate category
            </button>
          )}

          {/* Refresh/Recalculate - only for enabled items */}
          {item.is_enabled && !item.category_missing && (
            <button
              onClick={() => handleAction(onRefresh)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Recalculate target
            </button>
          )}

          {/* Add to rollup - only when item is enabled and handler is provided */}
          {item.is_enabled && onAddToRollup && (
            <>
              <div className="border-t my-1" style={{ borderColor: 'var(--monarch-border)' }} />
              <button
                onClick={() => handleAction(onAddToRollup)}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors"
                style={{ color: 'var(--monarch-orange)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
                Add to rollup
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
