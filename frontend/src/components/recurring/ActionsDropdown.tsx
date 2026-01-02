/**
 * ActionsDropdown - Actions dropdown menu for recurring items
 *
 * Accessibility features:
 * - aria-haspopup and aria-expanded on trigger button
 * - role="menu" on dropdown with proper aria-labelledby
 * - role="menuitem" on all action items
 * - Keyboard navigation (Escape to close, Enter/Space to activate)
 * - Focus management
 */

import { useCallback, useRef, useEffect, useId } from 'react';
import type { RecurringItem } from '../../types';
import { useDropdown } from '../../hooks';
import { Tooltip } from '../Tooltip';
import {
  SpinnerIcon,
  MoreVerticalIcon,
  XIcon,
  CheckFilledIcon,
  LinkIcon,
  RotateIcon,
  ArrowUpIcon,
} from '../icons';

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
  const menuId = useId();
  const triggerId = useId();
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const focusIndexRef = useRef(-1);

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
    dropdown.triggerRef.current?.focus();
    action();
  };

  // Handle keyboard navigation within menu
  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = menuItemsRef.current.filter((item): item is HTMLButtonElement => item !== null);
    const currentIndex = focusIndexRef.current;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        dropdown.close();
        dropdown.triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        focusIndexRef.current = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[focusIndexRef.current]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusIndexRef.current = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[focusIndexRef.current]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        focusIndexRef.current = 0;
        items[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        focusIndexRef.current = items.length - 1;
        items.at(-1)?.focus();
        break;
      case 'Tab':
        dropdown.close();
        break;
    }
  }, [dropdown]);

  // Focus first menu item when dropdown opens
  useEffect(() => {
    if (dropdown.isOpen) {
      focusIndexRef.current = 0;
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const firstItem = menuItemsRef.current.find((item): item is HTMLButtonElement => item !== null);
        firstItem?.focus();
      }, 0);
    } else {
      focusIndexRef.current = -1;
      menuItemsRef.current = [];
    }
  }, [dropdown.isOpen]);


  return (
    <div className="relative">
      <Tooltip content="Actions">
        <button
          id={triggerId}
          ref={dropdown.triggerRef}
          onClick={handleToggle}
          disabled={isLoading}
          aria-label={`Actions for ${item.name}`}
          aria-haspopup="menu"
          aria-expanded={dropdown.isOpen}
          aria-controls={dropdown.isOpen ? menuId : undefined}
          className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/10 disabled:opacity-50"
        >
          {isLoading ? (
            <SpinnerIcon size={16} color="var(--monarch-orange)" aria-hidden="true" />
          ) : (
            <MoreVerticalIcon size={16} color="var(--monarch-text-muted)" aria-hidden="true" />
          )}
        </button>
      </Tooltip>

      {dropdown.isOpen && (
        <div
          id={menuId}
          ref={dropdown.dropdownRef}
          role="menu"
          aria-labelledby={triggerId}
          aria-label={`Actions for ${item.name}`}
          onKeyDown={handleMenuKeyDown}
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
                <XIcon size={14} />
                Untrack
              </>
            ) : (
              <>
                <CheckFilledIcon size={14} color="var(--monarch-success)" />
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
              <LinkIcon size={14} />
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
              <RotateIcon size={14} />
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
              <RotateIcon size={14} />
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
                <ArrowUpIcon size={14} />
                Add to rollup
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
