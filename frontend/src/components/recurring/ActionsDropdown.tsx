/**
 * ActionsDropdown - Actions dropdown menu for recurring items
 *
 * Accessibility features:
 * - aria-haspopup and aria-expanded on trigger button
 * - role="menu" on dropdown with proper aria-labelledby
 * - Keyboard navigation (Escape to close, Enter/Space to activate)
 * - Focus management
 */

import { useState, useCallback, useRef, useEffect, useId } from 'react';
import type { RecurringItem } from '../../types';
import {
  SpinnerIcon,
  MoreVerticalIcon,
  XIcon,
  CheckFilledIcon,
  LinkIcon,
  RotateIcon,
  ArrowUpIcon,
  FolderIcon,
} from '../icons';
import { CategoryGroupDropdown } from './CategoryGroupDropdown';
import { decodeHtmlEntities } from '../../utils';
import { useIsRateLimited } from '../../context/RateLimitContext';

export interface ActionsDropdownProps {
  readonly item: RecurringItem;
  readonly onToggle: () => void;
  readonly onLinkCategory: () => void;
  readonly onRecreate: () => void;
  readonly onAddToRollup: (() => void) | undefined;
  readonly onRefresh: () => void;
  readonly onChangeGroup?: (groupId: string, groupName: string) => Promise<void>;
  readonly isToggling: boolean;
  readonly isRecreating: boolean;
  readonly isAddingToRollup: boolean;
  readonly isRefreshing: boolean;
  readonly showCategoryGroup?: boolean;
}

export function ActionsDropdown({
  item,
  onToggle,
  onLinkCategory,
  onRecreate,
  onAddToRollup,
  onRefresh,
  onChangeGroup,
  isToggling,
  isRecreating,
  isAddingToRollup,
  isRefreshing,
  showCategoryGroup = true,
}: ActionsDropdownProps) {
  const menuId = useId();
  const triggerId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const focusIndexRef = useRef(-1);
  const isRateLimited = useIsRateLimited();

  const isLoading = isToggling || isRecreating || isAddingToRollup || isRefreshing;
  const isDisabled = isLoading || isRateLimited;

  const handleToggle = () => {
    if (!isDisabled) {
      setIsOpen((prev) => !prev);
    }
  };

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleAction = (action: () => void) => {
    close();
    action();
  };

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  // Handle keyboard navigation within menu
  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = menuItemsRef.current.filter((item): item is HTMLButtonElement => item !== null);
      const currentIndex = focusIndexRef.current;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
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
          close();
          break;
      }
    },
    [close]
  );

  // Focus first menu item when dropdown opens
  useEffect(() => {
    if (isOpen) {
      focusIndexRef.current = 0;
      setTimeout(() => {
        const firstItem = menuItemsRef.current.find(
          (item): item is HTMLButtonElement => item !== null
        );
        firstItem?.focus();
      }, 0);
    } else {
      focusIndexRef.current = -1;
      menuItemsRef.current = [];
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        id={triggerId}
        onClick={handleToggle}
        disabled={isDisabled}
        aria-label={`Actions for ${decodeHtmlEntities(item.name)}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/10 disabled:opacity-50 ${
          isLoading ? 'cursor-wait' : 'cursor-pointer'
        }`}
      >
        {isLoading ? (
          <SpinnerIcon size={16} color="var(--monarch-orange)" aria-hidden="true" />
        ) : (
          <MoreVerticalIcon size={16} color="var(--monarch-text-muted)" aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          aria-label={`Actions for ${decodeHtmlEntities(item.name)}`}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full mt-1 z-popover py-1 rounded-lg shadow-lg text-sm min-w-45 dropdown-menu bg-monarch-bg-card border border-monarch-border"
        >
          {/* Change category group - first item when available */}
          {!showCategoryGroup &&
            item.is_enabled &&
            !item.category_missing &&
            onChangeGroup &&
            item.category_group_name && (
              <>
                <div className="px-3 py-2 flex items-center gap-2 text-monarch-text-dark">
                  <FolderIcon size={14} />
                  <CategoryGroupDropdown
                    currentGroupName={item.category_group_name}
                    onChangeGroup={async (groupId, groupName) => {
                      close();
                      await onChangeGroup(groupId, groupName);
                    }}
                  />
                </div>
                <div className="border-t my-1 border-monarch-border" />
              </>
            )}

          {/* Enable/Disable */}
          <button
            onClick={() => handleAction(onToggle)}
            className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors text-monarch-text-dark"
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
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors text-monarch-orange"
            >
              <LinkIcon size={14} />
              Link to existing category
            </button>
          )}

          {/* Recreate category - only when category is missing */}
          {item.is_enabled && item.category_missing && (
            <button
              onClick={() => handleAction(onRecreate)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors text-monarch-warning"
            >
              <RotateIcon size={14} />
              Recreate category
            </button>
          )}

          {/* Refresh/Recalculate - only for enabled items */}
          {item.is_enabled && !item.category_missing && (
            <button
              onClick={() => handleAction(onRefresh)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors text-monarch-text-dark"
            >
              <RotateIcon size={14} />
              Recalculate target
            </button>
          )}

          {/* Add to rollup - only when item is enabled and handler is provided */}
          {item.is_enabled && onAddToRollup && (
            <>
              <div className="border-t my-1 border-monarch-border" />
              <button
                onClick={() => handleAction(onAddToRollup)}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors text-monarch-orange"
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
