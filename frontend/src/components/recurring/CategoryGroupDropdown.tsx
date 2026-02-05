/**
 * CategoryGroupDropdown - Inline trigger with portal-based searchable dropdown
 *
 * Renders the category group name + chevron inline, and opens a
 * Portal-based dropdown with search on click. The Portal ensures
 * the dropdown is never clipped by row/table overflow.
 */

import { useState, useRef, useEffect, useId } from 'react';
import { Search, Check } from 'lucide-react';
import type { CategoryGroup } from '../../types';
import { useCategoryGroupsQuery } from '../../api/queries/dashboardQueries';
import { Portal } from '../Portal';
import { Tooltip } from '../ui/Tooltip';
import { useDropdown } from '../../hooks';
import { SpinnerIcon, ChevronDownIcon } from '../icons';
import { decodeHtmlEntities } from '../../utils';
import { UI } from '../../constants';

interface CategoryGroupDropdownProps {
  readonly currentGroupName: string | null;
  readonly onChangeGroup: (groupId: string, groupName: string) => Promise<void>;
  readonly disabled?: boolean;
}

export function CategoryGroupDropdown({
  currentGroupName,
  onChangeGroup,
  disabled,
}: CategoryGroupDropdownProps) {
  const [isChanging, setIsChanging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const triggerId = useId();

  const { data: groups = [], isLoading } = useCategoryGroupsQuery();
  const dropdown = useDropdown<HTMLDivElement, HTMLButtonElement>({ alignment: 'left' });

  const filteredGroups = searchQuery
    ? groups.filter((g) =>
        decodeHtmlEntities(g.name).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groups;

  // Focus search input when dropdown opens
  useEffect(() => {
    if (dropdown.isOpen) {
      setSearchQuery('');
      setActiveIndex(-1);
      setTimeout(() => searchInputRef.current?.focus(), UI.DELAY.FOCUS_AFTER_OPEN);
    }
  }, [dropdown.isOpen]);

  if (!currentGroupName) return null;

  const handleSelect = async (group: CategoryGroup): Promise<void> => {
    dropdown.close();
    dropdown.triggerRef.current?.focus();
    setIsChanging(true);
    try {
      await onChangeGroup(group.id, group.name);
    } finally {
      setIsChanging(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    const len = filteredGroups.length;
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        dropdown.close();
        dropdown.triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1 < len ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : len - 1));
        break;
      case 'Enter': {
        e.preventDefault();
        const opt = activeIndex >= 0 && activeIndex < len ? filteredGroups[activeIndex] : null;
        if (opt) handleSelect(opt);
        break;
      }
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(len - 1);
        break;
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!dropdown.isOpen) dropdown.toggle();
    }
  };

  return (
    <div className="inline-flex min-w-0 max-w-full">
      <Tooltip content="Change category group">
        <button
          ref={dropdown.triggerRef}
          id={triggerId}
          onClick={() => !(disabled || isChanging) && dropdown.toggle()}
          onKeyDown={handleTriggerKeyDown}
          disabled={disabled || isChanging}
          aria-label={`Change category group. Current: ${decodeHtmlEntities(currentGroupName)}`}
          aria-haspopup="listbox"
          aria-expanded={dropdown.isOpen}
          aria-controls={dropdown.isOpen ? listboxId : undefined}
          className="inline-flex items-center gap-1 min-w-0 max-w-full hover:opacity-70 transition-opacity disabled:opacity-50"
        >
          <span className="truncate">{decodeHtmlEntities(currentGroupName)}</span>
          {isChanging ? (
            <SpinnerIcon size={12} className="shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDownIcon size={12} className="shrink-0" aria-hidden="true" />
          )}
        </button>
      </Tooltip>

      {dropdown.isOpen && (
        <Portal>
          {/* Backdrop — stopPropagation prevents parent click-outside handlers
              from interfering when nested inside another dropdown */}
          <div
            className="fixed inset-0 z-(--z-index-dropdown)"
            onMouseDown={(e) => e.nativeEvent.stopPropagation()}
            onClick={() => dropdown.close()}
            aria-hidden="true"
          />
          <div
            ref={dropdown.dropdownRef}
            id={listboxId}
            role="listbox"
            aria-label="Category groups"
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
            }
            className="fixed rounded-lg shadow-lg border border-(--monarch-border) bg-(--monarch-bg-card) overflow-hidden dropdown-menu z-(--z-index-dropdown)"
            style={{
              top: dropdown.position.top,
              bottom: dropdown.position.bottom,
              left: dropdown.position.left,
              right: dropdown.position.right,
              minWidth: 200,
              maxWidth: '90vw',
            }}
            onMouseDown={(e) => e.nativeEvent.stopPropagation()}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
          >
            {/* Search input */}
            <div className="p-2 border-b border-(--monarch-border)">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--monarch-text-muted)"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search groups..."
                  aria-label="Search category groups"
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-(--monarch-border) bg-(--monarch-bg-page) text-(--monarch-text-dark) placeholder:text-(--monarch-text-muted) focus:outline-none focus:border-(--monarch-orange) focus:ring-1 focus:ring-(--monarch-orange)/20"
                />
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-60 overflow-y-auto" role="presentation">
              {(() => {
                if (isLoading) {
                  return (
                    <div
                      className="px-3 py-4 text-sm text-center text-(--monarch-text-muted)"
                      role="status"
                    >
                      Loading...
                    </div>
                  );
                }

                if (filteredGroups.length === 0) {
                  const emptyMessage = searchQuery ? 'No results found' : 'No groups available';
                  return (
                    <div className="px-3 py-4 text-sm text-center text-(--monarch-text-muted)">
                      {emptyMessage}
                    </div>
                  );
                }

                return filteredGroups.map((group, idx) => {
                  const isSelected = group.name === currentGroupName;
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={group.id}
                      id={`${listboxId}-option-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(group)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                        isSelected
                          ? 'bg-(--monarch-orange)/10 text-(--monarch-orange)'
                          : 'hover:bg-(--monarch-bg-hover) text-(--monarch-text-dark)'
                      } ${isActive && !isSelected ? 'bg-(--monarch-bg-hover)' : ''}`}
                    >
                      <span className="flex-1 truncate">{decodeHtmlEntities(group.name)}</span>
                      {isSelected && (
                        <Check
                          size={16}
                          className="text-(--monarch-orange) shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
