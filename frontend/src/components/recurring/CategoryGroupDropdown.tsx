/**
 * CategoryGroupDropdown - Dropdown for changing category groups
 *
 * Accessibility features:
 * - aria-haspopup and aria-expanded on trigger button
 * - role="listbox" on dropdown menu
 * - role="option" on menu items with aria-selected
 * - Keyboard navigation (Escape to close, Arrow keys, Enter to select)
 * - Focus management
 */

import React, { useState, useRef, useCallback, useEffect, useId } from 'react';
import type { CategoryGroup } from '../../types';
import { getCategoryGroups } from '../../api/client';
import { useClickOutside } from '../../hooks';
import { Tooltip } from '../ui/Tooltip';
import { SpinnerIcon, ChevronDownIcon } from '../icons';

interface CategoryGroupDropdownProps {
  readonly currentGroupName: string | null;
  readonly onChangeGroup: (groupId: string, groupName: string) => Promise<void>;
  readonly disabled?: boolean;
}

export function CategoryGroupDropdown({ currentGroupName, onChangeGroup, disabled }: CategoryGroupDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const triggerId = useId();

  useClickOutside([dropdownRef], () => setIsOpen(false), isOpen);

  const handleOpen = async () => {
    if (disabled || isChanging) return;
    setIsOpen(!isOpen);
    if (!isOpen && groups.length === 0) {
      setIsLoading(true);
      try {
        const data = await getCategoryGroups();
        setGroups(data);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSelect = async (group: CategoryGroup) => {
    setIsChanging(true);
    setIsOpen(false);
    triggerRef.current?.focus();
    try {
      await onChangeGroup(group.id, group.name);
    } finally {
      setIsChanging(false);
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev < groups.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : groups.length - 1));
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(groups.length - 1);
        break;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const selectedGroup = groups[focusedIndex];
        if (focusedIndex >= 0 && selectedGroup) {
          handleSelect(selectedGroup);
        }
        break;
      }
      case 'Tab':
        setIsOpen(false);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleOpen/handleSelect are stable
  }, [isOpen, groups, focusedIndex]);

  // Focus the selected option when dropdown opens or focus changes
  useEffect(() => {
    if (isOpen && focusedIndex >= 0) {
      optionRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  // Set initial focus to current group when opening
  useEffect(() => {
    if (isOpen && groups.length > 0 && !isLoading) {
      const currentIndex = groups.findIndex(g => g.name === currentGroupName);
      setFocusedIndex(Math.max(currentIndex, 0));
    }
  }, [isOpen, groups, isLoading, currentGroupName]);

  // Reset refs array when groups change
  useEffect(() => {
    optionRefs.current = [];
  }, [groups]);

  if (!currentGroupName) return null;

  return (
    <div className="relative inline-flex items-center gap-1 min-w-0 max-w-full" ref={dropdownRef}>
      <span className="truncate" id={`${triggerId}-label`}>{currentGroupName}</span>
      <Tooltip content="Change category group">
        <button
          id={triggerId}
          ref={triggerRef}
          onClick={handleOpen}
          onKeyDown={handleKeyDown}
          disabled={disabled || isChanging}
          aria-label={`Change category group. Current: ${currentGroupName}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          className="hover:opacity-70 transition-opacity disabled:opacity-50"
        >
          {isChanging ? (
            <SpinnerIcon size={12} aria-hidden="true" />
          ) : (
            <ChevronDownIcon size={12} aria-hidden="true" />
          )}
        </button>
      </Tooltip>
      {isOpen && (
        <div
          id={menuId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={triggerId}
          aria-activedescendant={focusedIndex >= 0 ? `${menuId}-option-${focusedIndex}` : undefined}
          onKeyDown={handleKeyDown}
          className="absolute left-0 top-6 z-dropdown py-1 rounded-lg shadow-lg text-sm max-h-64 overflow-y-auto dropdown-menu"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            minWidth: '180px',
          }}
        >
          {isLoading ? (
            <div className="px-3 py-2" style={{ color: 'var(--monarch-text-light)' }} aria-live="polite">
              Loading...
            </div>
          ) : (
            groups.map((group, index) => {
              const isSelected = group.name === currentGroupName;
              const isFocused = index === focusedIndex;
              const bgColor = isFocused || isSelected ? 'var(--monarch-bg-hover)' : 'transparent';
              return (
                <button
                  key={group.id}
                  id={`${menuId}-option-${index}`}
                  ref={el => { optionRefs.current[index] = el; }}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(group)}
                  className="w-full text-left px-3 py-2 hover:opacity-80 transition-opacity"
                  style={{
                    color: isSelected ? 'var(--monarch-orange)' : 'var(--monarch-text-dark)',
                    backgroundColor: bgColor,
                    outline: isFocused ? '2px solid var(--monarch-orange)' : 'none',
                    outlineOffset: '-2px',
                  }}
                >
                  {group.name}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
