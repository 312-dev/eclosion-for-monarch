/**
 * FrequencyGroup - Collapsible group of items organized by frequency
 */

import { useState } from 'react';
import type { RecurringItem } from '../../../types';
import type { PendingLink } from '../../LinkCategoryModal';
import { formatCurrency, formatFrequency } from '../../../utils';
import { FrequencyIcon } from '../SetupWizardIcons';
import { ChevronDownIcon } from '../../icons';
import { ItemCard } from './ItemCard';

export interface FrequencyGroupProps {
  readonly frequency: string;
  readonly items: RecurringItem[];
  readonly selectedIds: Set<string>;
  readonly pendingLinks: Map<string, PendingLink>;
  readonly onToggleItem: (id: string) => void;
  readonly onToggleGroup: (ids: string[], select: boolean) => void;
  readonly onLinkClick: (item: RecurringItem) => void;
  readonly onUnlink: (itemId: string) => void;
}

export function FrequencyGroup({
  frequency,
  items,
  selectedIds,
  pendingLinks,
  onToggleItem,
  onToggleGroup,
  onLinkClick,
  onUnlink,
}: FrequencyGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const groupIds = items.map(i => i.id);
  const selectedCount = groupIds.filter(id => selectedIds.has(id)).length;
  const allSelected = selectedCount === items.length;
  const someSelected = selectedCount > 0 && selectedCount < items.length;
  const totalMonthly = items.reduce((sum, i) => sum + i.monthly_contribution, 0);

  return (
    <div className="mb-4">
      <div
        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
        style={{ backgroundColor: 'var(--monarch-bg-page)' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <button
          className="p-1"
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed(!collapsed);
          }}
        >
          <ChevronDownIcon
            size={16}
            color="var(--monarch-text-muted)"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          />
        </button>

        <FrequencyIcon frequency={frequency} />

        <div className="flex-1">
          <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            {formatFrequency(frequency)}
          </span>
          <span className="text-sm ml-2" style={{ color: 'var(--monarch-text-muted)' }}>
            ({items.length} item{items.length !== 1 ? 's' : ''})
          </span>
        </div>

        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          {formatCurrency(totalMonthly)}/mo
        </div>

        <button
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{
            color: allSelected ? 'var(--monarch-text-muted)' : 'var(--monarch-orange)',
            backgroundColor: 'transparent',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleGroup(groupIds, !allSelected);
          }}
        >
          {allSelected ? 'Deselect' : someSelected ? 'Select all' : 'Select all'}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-2 mt-2 pl-2">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              checked={selectedIds.has(item.id)}
              onChange={() => onToggleItem(item.id)}
              onLinkClick={() => onLinkClick(item)}
              onUnlink={() => onUnlink(item.id)}
              pendingLink={pendingLinks.get(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
