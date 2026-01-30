/**
 * StashTitleDropdown - Dropdown menu for stash title actions
 *
 * Provides quick navigation options:
 * - View category on Monarch Money
 * - View filtered report for this stash
 *
 * Renders as an invisible clickable overlay that opens the dropdown.
 */

import { useState, useCallback, useRef, useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLinkIcon, Icons } from '../icons';
import { decodeHtmlEntities } from '../../utils';
import { motion, AnimatePresence, slideDownVariants } from '../motion';

interface StashTitleDropdownProps {
  readonly stashName: string;
  readonly categoryId: string | null;
  readonly onViewReport: () => void;
  readonly children: ReactNode;
}

export function StashTitleDropdown({
  stashName,
  categoryId,
  onViewReport,
  children,
}: StashTitleDropdownProps) {
  const menuId = useId();
  const triggerId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | HTMLAnchorElement | null)[]>([]);
  const focusIndexRef = useRef(-1);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }

    setIsOpen((prev) => !prev);
  };

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleViewReport = () => {
    close();
    onViewReport();
  };

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        // Check if click is on the menu
        const target = event.target as HTMLElement;
        if (!target.closest(`#${menuId}`)) {
          close();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close, menuId]);

  // Handle keyboard navigation
  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = menuItemsRef.current.filter(
        (item): item is HTMLButtonElement | HTMLAnchorElement => item !== null
      );
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
          (item): item is HTMLButtonElement | HTMLAnchorElement => item !== null
        );
        firstItem?.focus();
      }, 0);
    } else {
      focusIndexRef.current = -1;
      menuItemsRef.current = [];
    }
  }, [isOpen]);

  // Generate Monarch category URL if categoryId is available
  const monarchUrl = categoryId
    ? `https://app.monarch.com/categories/${categoryId}?breakdown=category&date=${new Date().toISOString().split('T')[0]}&sankey=category&timeframe=month&view=breakdown`
    : null;

  let itemIndex = 0;

  return (
    <>
      {/* Clickable title wrapper */}
      <button
        ref={triggerRef}
        id={triggerId}
        onClick={handleToggle}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={`Options for ${decodeHtmlEntities(stashName)}`}
        className="cursor-pointer inline-block bg-transparent border-none p-0 font-inherit text-inherit"
      >
        {children}
      </button>

      {/* Portal the dropdown menu to body to avoid overflow clipping */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              id={menuId}
              role="menu"
              aria-labelledby={triggerId}
              aria-label={`Options for ${decodeHtmlEntities(stashName)}`}
              onKeyDown={handleMenuKeyDown}
              tabIndex={-1}
              className="fixed py-1 rounded-lg shadow-lg text-sm dropdown-menu bg-monarch-bg-card border border-monarch-border origin-top-left"
              style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                zIndex: 1000,
                minWidth: '240px',
              }}
              variants={slideDownVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {/* View report */}
              <button
                ref={(el) => {
                  menuItemsRef.current[itemIndex++] = el;
                }}
                role="menuitem"
                onClick={handleViewReport}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors text-monarch-text-dark"
              >
                <Icons.BarChart2 size={14} />
                View report
              </button>

              {/* View category on Monarch */}
              {monarchUrl && (
                <a
                  ref={(el) => {
                    menuItemsRef.current[itemIndex++] = el;
                  }}
                  role="menuitem"
                  href={monarchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={close}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors text-monarch-text-dark"
                >
                  <ExternalLinkIcon size={14} />
                  View category on Monarch
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
