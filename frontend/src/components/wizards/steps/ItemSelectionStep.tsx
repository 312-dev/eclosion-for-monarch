/**
 * ItemSelectionStep - Item selection step for the setup wizard
 */

import { useState } from 'react';
import type { RecurringItem } from '../../../types';
import type { PendingLink } from '../../LinkCategoryModal';
import { formatDueDate, formatCurrency, formatFrequency } from '../../../utils';
import { EmptyInboxIcon, LinkIcon, FrequencyIcon } from '../SetupWizardIcons';
import { CheckIcon, ChevronDownIcon, LinkIcon as LinkIconComponent, FolderIcon } from '../../icons';


// Merchant Logo Component with fallback
function MerchantLogo({ item, size = 40 }: { readonly item: RecurringItem; readonly size?: number }) {
  const [imgError, setImgError] = useState(false);
  const displayName = item.merchant_name || item.name;
  const initial = displayName.charAt(0).toUpperCase();

  const colors = [
    '#FF692D', '#4A90D9', '#50C878', '#9B59B6', '#E74C3C',
    '#3498DB', '#1ABC9C', '#F39C12', '#E91E63', '#00BCD4'
  ];
  const colorIndex = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const bgColor = colors[colorIndex];

  if (item.logo_url && !imgError) {
    return (
      <img
        src={item.logo_url}
        alt=""
        className="rounded-lg object-cover"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="rounded-lg flex items-center justify-center text-white font-semibold"
      style={{ width: size, height: size, backgroundColor: bgColor, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

interface ItemCardProps {
  readonly item: RecurringItem;
  readonly checked: boolean;
  readonly onChange: () => void;
  readonly onLinkClick: (() => void) | undefined;
  readonly onUnlink: (() => void) | undefined;
  readonly pendingLink: PendingLink | undefined;
}

function ItemCard({ item, checked, onChange, onLinkClick, onUnlink, pendingLink }: ItemCardProps) {
  const displayName = item.merchant_name || item.name.split(' (')[0];
  const isLinked = !!pendingLink;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover-item-card-unchecked ${checked ? 'item-card-checked' : ''}`}
      style={{
        backgroundColor: checked ? 'rgba(255, 105, 45, 0.08)' : 'var(--monarch-bg-card)',
        border: checked ? '1px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
      }}
      onClick={onChange}
    >
      <div
        className="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
        style={{
          borderColor: checked ? 'var(--monarch-orange)' : 'var(--monarch-border)',
          backgroundColor: checked ? 'var(--monarch-orange)' : 'transparent',
        }}
      >
        {checked && (
          <CheckIcon size={12} color="white" strokeWidth={3} />
        )}
      </div>

      <MerchantLogo item={item} size={40} />

      <div className="flex-1 min-w-0">
        <div className="font-medium truncate" style={{ color: 'var(--monarch-text-dark)' }}>
          {displayName}
        </div>
        <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
          {isLinked ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnlink?.();
              }}
              className="inline-flex items-center gap-1 hover:underline"
              style={{ color: 'var(--monarch-success)' }}
              title="Click to unlink"
            >
              <LinkIconComponent size={12} />
              {pendingLink.categoryIcon && <span>{pendingLink.categoryIcon}</span>}
              {pendingLink.categoryName}
              <span style={{ color: 'var(--monarch-text-muted)' }}>x</span>
            </button>
          ) : (
            formatDueDate(item.next_due_date)
          )}
        </div>
      </div>

      <div className="text-right shrink-0 flex items-center gap-2">
        {checked && onLinkClick && !isLinked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLinkClick();
            }}
            className="p-1.5 rounded hover-link-icon"
            title="Link to existing category"
            data-tour="link-icon"
          >
            <LinkIcon size={16} />
          </button>
        )}
        <div>
          <div className="font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
            {formatCurrency(item.monthly_contribution)}/mo
          </div>
          <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
            {formatCurrency(item.amount)} {formatFrequency(item.frequency).toLowerCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FrequencyGroupProps {
  readonly frequency: string;
  readonly items: RecurringItem[];
  readonly selectedIds: Set<string>;
  readonly pendingLinks: Map<string, PendingLink>;
  readonly onToggleItem: (id: string) => void;
  readonly onToggleGroup: (ids: string[], select: boolean) => void;
  readonly onLinkClick: (item: RecurringItem) => void;
  readonly onUnlink: (itemId: string) => void;
}

function FrequencyGroup({
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

interface ItemSelectionStepProps {
  readonly items: RecurringItem[];
  readonly selectedIds: Set<string>;
  readonly pendingLinks: Map<string, PendingLink>;
  readonly onToggleItem: (id: string) => void;
  readonly onSelectAll: () => void;
  readonly onDeselectAll: () => void;
  readonly onRefresh: () => void;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onToggleGroup: (ids: string[], select: boolean) => void;
  readonly onLinkClick: (item: RecurringItem) => void;
  readonly onUnlink: (itemId: string) => void;
  readonly categoryGroupName: string;
  readonly onChangeGroup: () => void;
}

export function ItemSelectionStep({
  items,
  selectedIds,
  pendingLinks,
  onToggleItem,
  onSelectAll,
  onDeselectAll,
  onRefresh,
  loading,
  error,
  onToggleGroup,
  onLinkClick,
  onUnlink,
  categoryGroupName,
  onChangeGroup,
}: ItemSelectionStepProps) {
  // Group items by frequency and sort by amount (largest first)
  const groupedItems = items.reduce((groups, item) => {
    const freq = item.frequency || 'monthly';
    if (!groups[freq]) groups[freq] = [];
    groups[freq].push(item);
    return groups;
  }, {} as Record<string, RecurringItem[]>);

  // Sort each group by amount descending
  Object.keys(groupedItems).forEach(freq => {
    const group = groupedItems[freq];
    if (group) {
      group.sort((a, b) => b.amount - a.amount);
    }
  });

  // Sort groups by frequency order
  const sortedFrequencies = Object.keys(groupedItems).filter((f: string) => {
    const group = groupedItems[f];
    return group && group.length > 0;
  });

  // Calculate totals
  const totalMonthly = items.reduce((sum, i) => sum + i.monthly_contribution, 0);
  const selectedMonthly = items
    .filter(i => selectedIds.has(i.id))
    .reduce((sum, i) => sum + i.monthly_contribution, 0);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          Loading Recurring Items...
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div
                className="h-10 rounded-lg animate-pulse mb-2"
                style={{ backgroundColor: 'var(--monarch-bg-page)' }}
              />
              <div className="space-y-2 pl-2">
                {[1, 2].map((j) => (
                  <div
                    key={j}
                    className="h-16 rounded-lg animate-pulse"
                    style={{ backgroundColor: 'var(--monarch-bg-page)', opacity: 0.6 }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          Create Dedicated Categories
        </h2>
        <div
          className="p-4 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
        >
          {error}
        </div>
        <button
          onClick={onRefresh}
          className="mt-4 text-sm px-4 py-2 rounded-lg transition-colors"
          style={{
            color: 'var(--monarch-orange)',
            border: '1px solid var(--monarch-orange)',
            backgroundColor: 'transparent',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="animate-fade-in text-center py-8">
        <div className="mb-4 flex justify-center">
          <EmptyInboxIcon size={48} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          No Recurring Items Found
        </h2>
        <p style={{ color: 'var(--monarch-text-muted)' }}>
          You don't have any recurring transactions in Monarch Money yet, or they're all already being tracked.
        </p>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="mt-4 text-sm px-4 py-2 rounded-lg hover-bg-transparent-to-orange-light"
          style={{
            color: 'var(--monarch-orange)',
            border: '1px solid var(--monarch-orange)',
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh from Monarch'}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        Create Dedicated Categories
      </h2>
      <p className="mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
        Each selected item will get its own budget category.
      </p>

      {/* Summary bar */}
      <div
        className="flex items-center justify-between p-3 rounded-lg mb-4"
        style={{ backgroundColor: 'rgba(255, 105, 45, 0.08)', border: '1px solid var(--monarch-border)' }}
      >
        <div>
          <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            {selectedIds.size} of {items.length}
          </span>
          <span className="text-sm ml-1" style={{ color: 'var(--monarch-text-muted)' }}>
            items selected
          </span>
        </div>
        <div className="text-right">
          <span className="font-semibold" style={{ color: 'var(--monarch-orange)' }}>
            {formatCurrency(selectedMonthly)}
          </span>
          <span className="text-sm ml-1" style={{ color: 'var(--monarch-text-muted)' }}>
            / {formatCurrency(totalMonthly)} monthly
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={onSelectAll}
          className="text-xs px-3 py-1.5 rounded-full hover-bg-transparent-to-orange-light"
          style={{
            color: 'var(--monarch-orange)',
            border: '1px solid var(--monarch-orange)',
          }}
        >
          Select All
        </button>
        <button
          onClick={onDeselectAll}
          className="text-xs px-3 py-1.5 rounded-full hover-bg-transparent-to-hover"
          style={{
            color: 'var(--monarch-text-muted)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          Deselect All
        </button>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-full transition-colors ml-auto"
          style={{
            color: 'var(--monarch-text-muted)',
            border: '1px solid var(--monarch-border)',
            backgroundColor: 'transparent',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Category group info */}
      <div
        className="flex items-center gap-2 mb-4 text-sm"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        <FolderIcon size={16} color="var(--monarch-orange)" />
        <span>Creating in:</span>
        <button
          onClick={onChangeGroup}
          className="font-medium hover:underline"
          style={{ color: 'var(--monarch-orange)' }}
        >
          {categoryGroupName || 'Select a group'}
        </button>
      </div>

      {/* Grouped items */}
      <div
        className="max-h-64 overflow-y-auto pr-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {sortedFrequencies.map((frequency: string) => (
          <FrequencyGroup
            key={frequency}
            frequency={frequency}
            items={groupedItems[frequency] ?? []}
            selectedIds={selectedIds}
            pendingLinks={pendingLinks}
            onToggleItem={onToggleItem}
            onToggleGroup={onToggleGroup}
            onLinkClick={onLinkClick}
            onUnlink={onUnlink}
          />
        ))}
      </div>
    </div>
  );
}
