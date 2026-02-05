/**
 * EnableTrackingMenu - Dropdown menu for enabling tracking on a disabled recurring item
 *
 * Offers three ways to start tracking: create a dedicated category,
 * link to an existing category, or add to a roll-up.
 */

import { useState, useCallback, useRef, useEffect, useId } from 'react';
import { Tooltip } from '../ui/Tooltip';
import { SpinnerIcon, CheckIcon, BlockedIcon, PlusIcon, LinkIcon, ArrowUpIcon } from '../icons';

interface EnableTrackingMenuProps {
  readonly onCreateCategory: () => void;
  readonly onLinkCategory: () => void;
  readonly onAddToRollup: (() => void) | undefined;
  readonly isToggling: boolean;
  readonly isDisabled: boolean;
}

export function EnableTrackingMenu({
  onCreateCategory,
  onLinkCategory,
  onAddToRollup,
  isToggling,
  isDisabled,
}: EnableTrackingMenuProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const focusIndexRef = useRef(-1);
  const menuId = useId();
  const triggerId = useId();

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleAction = (action: () => void): void => {
    close();
    action();
  };

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  // Keyboard navigation
  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = menuItemsRef.current.filter((el): el is HTMLButtonElement => el !== null);
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

  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen) {
      focusIndexRef.current = 0;
      setTimeout(() => {
        const firstItem = menuItemsRef.current.find((el): el is HTMLButtonElement => el !== null);
        firstItem?.focus();
      }, 0);
    } else {
      focusIndexRef.current = -1;
      menuItemsRef.current = [];
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <Tooltip content="Click to enable tracking">
        <button
          id={triggerId}
          onClick={() => !isDisabled && setIsOpen((prev) => !prev)}
          disabled={isDisabled}
          aria-label="Enable tracking"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          className="group/toggle shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 bg-(--monarch-bg-page) hover:bg-(--monarch-success)/15"
        >
          {isToggling ? (
            <SpinnerIcon size={20} color="var(--monarch-orange)" strokeWidth={2} />
          ) : (
            <>
              <BlockedIcon
                size={20}
                color="var(--monarch-text-muted)"
                strokeWidth={1.5}
                className="group-hover/toggle:hidden"
              />
              <CheckIcon
                size={20}
                color="var(--monarch-success)"
                strokeWidth={3}
                className="hidden group-hover/toggle:block"
              />
            </>
          )}
        </button>
      </Tooltip>
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          tabIndex={-1}
          aria-labelledby={triggerId}
          onKeyDown={handleMenuKeyDown}
          className="absolute left-0 top-full mt-1 z-popover py-1 rounded-lg shadow-lg text-sm min-w-56 dropdown-menu bg-monarch-bg-card border border-monarch-border"
        >
          <button
            ref={(el) => {
              menuItemsRef.current[0] = el;
            }}
            role="menuitem"
            onClick={() => handleAction(onCreateCategory)}
            className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors text-monarch-text-dark"
          >
            <PlusIcon size={14} />
            Create dedicated category
          </button>
          <button
            ref={(el) => {
              menuItemsRef.current[1] = el;
            }}
            role="menuitem"
            onClick={() => handleAction(onLinkCategory)}
            className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors text-monarch-text-dark"
          >
            <LinkIcon size={14} />
            Link to existing category
          </button>
          {onAddToRollup && (
            <button
              ref={(el) => {
                menuItemsRef.current[2] = el;
              }}
              role="menuitem"
              onClick={() => handleAction(onAddToRollup)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors text-monarch-text-dark"
            >
              <ArrowUpIcon size={14} />
              Add to roll-up
            </button>
          )}
        </div>
      )}
    </div>
  );
}
