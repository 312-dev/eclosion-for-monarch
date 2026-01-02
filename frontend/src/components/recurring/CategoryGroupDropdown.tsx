/**
 * CategoryGroupDropdown - Dropdown for changing category groups
 */

import { useState, useRef } from 'react';
import type { CategoryGroup } from '../../types';
import { getCategoryGroups } from '../../api/client';
import { useClickOutside } from '../../hooks';
import { Tooltip } from '../Tooltip';

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
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    try {
      await onChangeGroup(group.id, group.name);
    } finally {
      setIsChanging(false);
    }
  };

  if (!currentGroupName) return null;

  return (
    <div className="relative inline-flex items-center gap-1 min-w-0 max-w-full" ref={dropdownRef}>
      <span className="truncate">{currentGroupName}</span>
      <Tooltip content="Change category group">
        <button
          onClick={handleOpen}
          disabled={disabled || isChanging}
          className="hover:opacity-70 transition-opacity disabled:opacity-50"
        >
          {isChanging ? (
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </button>
      </Tooltip>
      {isOpen && (
        <div
          className="absolute left-0 top-6 z-dropdown py-1 rounded-lg shadow-lg text-sm max-h-64 overflow-y-auto dropdown-menu"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            minWidth: '180px',
          }}
        >
          {isLoading ? (
            <div className="px-3 py-2" style={{ color: 'var(--monarch-text-light)' }}>
              Loading...
            </div>
          ) : (
            groups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleSelect(group)}
                className="w-full text-left px-3 py-2 hover:opacity-80 transition-opacity"
                style={{
                  color: group.name === currentGroupName ? 'var(--monarch-orange)' : 'var(--monarch-text-dark)',
                  backgroundColor: group.name === currentGroupName ? 'var(--monarch-bg-hover)' : 'transparent',
                }}
              >
                {group.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
