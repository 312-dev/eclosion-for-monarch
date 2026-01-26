/* eslint-disable jsx-a11y/prefer-tag-over-role */
/**
 * UnitSelector Component
 *
 * An inline dropdown for switching between dollar amount and percentage input modes.
 * Shows the current symbol ($/%) with a micro chevron to indicate it's interactive.
 */

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../icons';
import { Z_INDEX } from '../../constants';

type InputMode = 'amount' | 'percent';

interface UnitSelectorProps {
  /** Current input mode */
  readonly mode: InputMode;
  /** Callback when mode changes. If undefined, selector is read-only. */
  readonly onChange?: ((mode: InputMode) => void) | undefined;
}

export function UnitSelector({ mode, onChange }: UnitSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const triggerId = useId();

  const symbol = mode === 'amount' ? '$' : '%';

  // Calculate dropdown position when opening
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = 80; // Approximate height of 2 menu items
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const openUpward = spaceBelow < dropdownHeight + 8;

      setDropdownStyle({
        position: 'fixed',
        left: triggerRect.left,
        minWidth: 96,
        zIndex: Z_INDEX.TOOLTIP,
        ...(openUpward
          ? { bottom: window.innerHeight - triggerRect.top + 4 }
          : { top: triggerRect.bottom + 4 }),
      });
    }
  }, [isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleToggle = () => {
    if (onChange) {
      setIsOpen((prev) => !prev);
    }
  };

  const handleSelect = useCallback(
    (newMode: InputMode) => {
      onChange?.(newMode);
      close();
    },
    [onChange, close]
  );

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'ArrowDown':
        case 'ArrowUp':
          e.preventDefault();
          // With only 2 options, arrow keys just toggle
          handleSelect(mode === 'amount' ? 'percent' : 'amount');
          break;
        case 'Enter':
        case ' ':
          if (!isOpen) {
            e.preventDefault();
            setIsOpen(true);
          }
          break;
      }
    },
    [close, isOpen, mode, handleSelect]
  );

  // Focus menu when opened
  useEffect(() => {
    if (isOpen && menuRef.current) {
      menuRef.current.focus();
    }
  }, [isOpen]);

  const dropdown =
    isOpen &&
    createPortal(
      <div
        id={menuId}
        ref={menuRef}
        role="listbox"
        aria-labelledby={triggerId}
        aria-activedescendant={`${menuId}-${mode}`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="py-1 rounded-lg shadow-lg text-sm bg-monarch-bg-card border border-monarch-border"
        style={dropdownStyle}
      >
        <button
          id={`${menuId}-amount`}
          type="button"
          role="option"
          aria-selected={mode === 'amount'}
          onClick={() => handleSelect('amount')}
          className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${
            mode === 'amount'
              ? 'bg-monarch-bg-hover text-monarch-text-dark'
              : 'text-monarch-text-muted hover:bg-monarch-bg-hover hover:text-monarch-text-dark'
          }`}
        >
          <span className="w-4 text-center">$</span>
          <span>Amount</span>
        </button>
        <button
          id={`${menuId}-percent`}
          type="button"
          role="option"
          aria-selected={mode === 'percent'}
          onClick={() => handleSelect('percent')}
          className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${
            mode === 'percent'
              ? 'bg-monarch-bg-hover text-monarch-text-dark'
              : 'text-monarch-text-muted hover:bg-monarch-bg-hover hover:text-monarch-text-dark'
          }`}
        >
          <span className="w-4 text-center">%</span>
          <span>Percent</span>
        </button>
      </div>,
      document.body
    );

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-label={`Input mode: ${mode === 'amount' ? 'Dollar amount' : 'Percentage'}. Click to change.`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        className={`flex items-center gap-0.5 ml-1.5 px-1.5 py-1 rounded transition-colors font-medium text-monarch-text-muted ${
          onChange ? 'hover:bg-monarch-bg-hover hover:text-monarch-text-dark cursor-pointer' : ''
        }`}
      >
        <span>{symbol}</span>
        {onChange && <Icons.ChevronDown size={10} aria-hidden="true" />}
      </button>
      {dropdown}
    </>
  );
}
