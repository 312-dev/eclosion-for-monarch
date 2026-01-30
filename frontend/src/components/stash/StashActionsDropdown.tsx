/**
 * StashActionsDropdown - Actions menu for stash items
 *
 * Provides actions specific to stash items:
 * - Edit item details
 * - Open source URL
 * - Change category group
 * - Archive item
 * - Delete item
 */

import { useState, useCallback, useRef, useEffect, useId } from 'react';
import type { StashItem } from '../../types';
import {
  SpinnerIcon,
  MoreVerticalIcon,
  PackageIcon,
  TrashIcon,
  EditIcon,
  ExternalLinkIcon,
  FolderIcon,
} from '../icons';
import { CategoryGroupDropdown } from '../recurring/CategoryGroupDropdown';
import { decodeHtmlEntities } from '../../utils';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { motion, AnimatePresence, slideDownVariants } from '../motion';

interface StashActionsDropdownProps {
  readonly item: StashItem;
  readonly onEdit: () => void;
  readonly onArchive: () => Promise<void>;
  readonly onDelete: () => Promise<void>;
  readonly onChangeGroup?: (groupId: string, groupName: string) => Promise<void>;
  readonly isArchiving: boolean;
}

export function StashActionsDropdown({
  item,
  onEdit,
  onArchive,
  onDelete,
  onChangeGroup,
  isArchiving,
}: StashActionsDropdownProps) {
  const menuId = useId();
  const triggerId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const focusIndexRef = useRef(-1);
  const isRateLimited = useIsRateLimited();

  const isLoading = isArchiving || isDeleting;
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

  const handleAsyncAction = async (action: () => Promise<void>) => {
    close();
    await action();
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

  // Handle keyboard navigation
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  let itemIndex = 0;

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
        className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/10 disabled:opacity-50"
      >
        {isLoading ? (
          <SpinnerIcon size={16} color="var(--monarch-orange)" aria-hidden="true" />
        ) : (
          <MoreVerticalIcon size={16} color="var(--monarch-text-muted)" aria-hidden="true" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={menuId}
            role="menu"
            aria-labelledby={triggerId}
            aria-label={`Actions for ${decodeHtmlEntities(item.name)}`}
            onKeyDown={handleMenuKeyDown}
            tabIndex={-1}
            className="absolute right-0 top-full mt-1 z-popover py-1 rounded-lg shadow-lg text-sm min-w-45 dropdown-menu bg-monarch-bg-card border border-monarch-border origin-top-right"
            variants={slideDownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Edit item */}
            <button
              ref={(el) => {
                menuItemsRef.current[itemIndex++] = el;
              }}
              role="menuitem"
              onClick={() => handleAction(onEdit)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors text-monarch-text-dark"
            >
              <EditIcon size={14} />
              Edit details
            </button>

            {/* Open source URL */}
            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors text-monarch-text-dark"
              >
                <ExternalLinkIcon size={14} />
                Open source URL
              </a>
            )}

            {/* Change category group */}
            {onChangeGroup && item.category_group_name && (
              <>
                <div className="border-t my-1 border-monarch-border" />
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
              </>
            )}

            <div className="border-t my-1 border-monarch-border" />

            {/* Archive */}
            <button
              ref={(el) => {
                menuItemsRef.current[itemIndex++] = el;
              }}
              role="menuitem"
              onClick={() => handleAsyncAction(onArchive)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors text-monarch-teal"
            >
              <PackageIcon size={14} />
              Archive
            </button>

            {/* Delete */}
            <button
              ref={(el) => {
                menuItemsRef.current[itemIndex++] = el;
              }}
              role="menuitem"
              onClick={() => handleAsyncAction(handleDelete)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors text-monarch-warning"
            >
              <TrashIcon size={14} />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
