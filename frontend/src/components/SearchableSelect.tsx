import { useState, useEffect, useRef, useId } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { Portal } from './Portal';
import { useDropdown } from '../hooks/useDropdown';
import { UI } from '../constants';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options?: SelectOption[];
  groups?: SelectGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  className?: string;
  onOpen?: () => void;
  /** Accessible label for the select */
  'aria-label'?: string;
  /** ID of element that labels this select */
  'aria-labelledby'?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options = [],
  groups,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  disabled = false,
  loading = false,
  searchable = true,
  className = '',
  onOpen,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}: Readonly<SearchableSelectProps>) {
  const listboxId = useId();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdown = useDropdown<HTMLDivElement, HTMLButtonElement>({ alignment: 'left' });

  // Get all options (either flat or from groups)
  const allOptions = groups
    ? groups.flatMap((g) => g.options)
    : options;

  // Find selected option
  const selectedOption = allOptions.find((opt) => opt.value === value);

  // Filter options based on search
  const filterOptions = (opts: SelectOption[]) =>
    searchQuery
      ? opts.filter((opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : opts;

  const filteredOptions = filterOptions(options);
  const filteredGroups = groups?.map((g) => ({
    ...g,
    options: filterOptions(g.options),
  })).filter((g) => g.options.length > 0);

  // Get flat list for keyboard navigation
  const flatFilteredOptions = groups
    ? (filteredGroups?.flatMap((g) => g.options) ?? [])
    : filteredOptions;

  const hasResults = flatFilteredOptions.length > 0;

  // Handle open
  useEffect(() => {
    if (dropdown.isOpen) {
      onOpen?.();
      setSearchQuery('');
      setActiveIndex(-1);
      // Focus search input on next tick after dropdown opens
      setTimeout(() => searchInputRef.current?.focus(), UI.DELAY.FOCUS_AFTER_OPEN);
    }
  }, [dropdown.isOpen, onOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        dropdown.close();
        dropdown.triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => {
          const nextIndex = prev + 1;
          return nextIndex < flatFilteredOptions.length ? nextIndex : 0;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => {
          const nextIndex = prev - 1;
          return nextIndex >= 0 ? nextIndex : flatFilteredOptions.length - 1;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < flatFilteredOptions.length) {
          const opt = flatFilteredOptions[activeIndex];
          if (opt && !opt.disabled) {
            handleSelect(opt.value);
          }
        }
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(flatFilteredOptions.length - 1);
        break;
    }
  };

  // Handle trigger keyboard events
  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!dropdown.isOpen) {
        dropdown.toggle();
      }
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    dropdown.close();
    dropdown.triggerRef.current?.focus();
  };

  const renderOption = (opt: SelectOption, flatIndex: number) => {
    const isSelected = opt.value === value;
    const isActive = flatIndex === activeIndex;
    const optionId = `${listboxId}-option-${flatIndex}`;

    return (
      <button
        key={opt.value}
        id={optionId}
        type="button"
        role="option"
        aria-selected={isSelected}
        aria-disabled={opt.disabled}
        onClick={() => !opt.disabled && handleSelect(opt.value)}
        disabled={opt.disabled}
        className={`
          w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors
          ${opt.disabled
            ? 'opacity-50 cursor-not-allowed bg-(--monarch-bg-page)'
            : isSelected
              ? 'bg-(--monarch-orange)/10 text-(--monarch-orange)'
              : 'hover:bg-(--monarch-bg-hover) text-(--monarch-text-dark)'
          }
          ${isActive && !opt.disabled ? 'ring-2 ring-inset ring-(--monarch-orange)' : ''}
        `}
        title={opt.disabled ? opt.disabledReason : undefined}
        onMouseEnter={() => setActiveIndex(flatIndex)}
      >
        <span className="flex-1 truncate">{opt.label}</span>
        {isSelected && (
          <Check size={16} className="text-(--monarch-orange) shrink-0" aria-hidden="true" />
        )}
      </button>
    );
  };

  // Track flat index for keyboard navigation across groups
  let flatIndex = 0;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={dropdown.triggerRef}
        type="button"
        onClick={() => !disabled && dropdown.toggle()}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={dropdown.isOpen}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-controls={dropdown.isOpen ? listboxId : undefined}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm rounded-lg
          border border-(--monarch-border) bg-(--monarch-bg-card)
          transition-colors
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-(--monarch-text-muted) cursor-pointer'
          }
          ${dropdown.isOpen ? 'border-(--monarch-orange) ring-1 ring-(--monarch-orange)/20' : ''}
        `}
      >
        <span
          className={`truncate ${selectedOption ? 'text-(--monarch-text-dark)' : 'text-(--monarch-text-muted)'}`}
        >
          {loading ? 'Loading...' : selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`
            shrink-0 text-(--monarch-text-muted) transition-transform
            ${dropdown.isOpen ? 'rotate-180' : ''}
          `}
          aria-hidden="true"
        />
      </button>

      {dropdown.isOpen && (
        <Portal>
          {/* Backdrop for closing */}
          <div
            className="fixed inset-0 z-(--z-index-dropdown)"
            onClick={() => dropdown.close()}
            aria-hidden="true"
          />
          <div
            ref={dropdown.dropdownRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel || placeholder}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
            className="fixed z-(--z-index-dropdown) min-w-50 max-w-75 rounded-lg shadow-lg border border-(--monarch-border) bg-(--monarch-bg-card) overflow-hidden dropdown-menu"
            style={{
              top: dropdown.position.top,
              left: dropdown.position.left,
              right: dropdown.position.right,
            }}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
          >
            {/* Search input */}
            {searchable && (
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
                    placeholder={searchPlaceholder}
                    aria-label="Search options"
                    className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-(--monarch-border) bg-(--monarch-bg-page) text-(--monarch-text-dark) placeholder:text-(--monarch-text-muted) focus:outline-none focus:border-(--monarch-orange) focus:ring-1 focus:ring-(--monarch-orange)/20"
                  />
                </div>
              </div>
            )}

            {/* Options list */}
            <div className="max-h-60 overflow-y-auto" role="presentation">
              {loading ? (
                <div className="px-3 py-4 text-sm text-center text-(--monarch-text-muted)" role="status">
                  Loading...
                </div>
              ) : !hasResults ? (
                <div className="px-3 py-4 text-sm text-center text-(--monarch-text-muted)">
                  {searchQuery ? 'No results found' : 'No options available'}
                </div>
              ) : groups ? (
                // Render grouped options
                filteredGroups?.map((group, groupIdx) => {
                  const groupElement = (
                    <div key={group.label} role="group" aria-label={group.label}>
                      {groupIdx > 0 && (
                        <div className="h-px bg-(--monarch-border) mx-2" aria-hidden="true" />
                      )}
                      <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-(--monarch-text-muted) bg-(--monarch-bg-page)" role="presentation">
                        {group.label}
                      </div>
                      {group.options.map((opt) => {
                        const element = renderOption(opt, flatIndex);
                        flatIndex++;
                        return element;
                      })}
                    </div>
                  );
                  return groupElement;
                })
              ) : (
                // Render flat options
                filteredOptions.map((opt) => {
                  const element = renderOption(opt, flatIndex);
                  flatIndex++;
                  return element;
                })
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
