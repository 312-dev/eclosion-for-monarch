/**
 * Recurring Setup Wizard
 *
 * Per-tool setup wizard for the Recurring Expenses feature.
 * Shown within the RecurringTab when the feature is not yet configured.
 *
 * Steps:
 * 1. Category Group Selection - Choose where to create budget categories
 * 2. Item Selection - Select recurring items to track (with category linking)
 * 3. Rollup Explanation - Explain the rollup concept
 */

import { useState, useEffect, useCallback } from 'react';
import { TourProvider } from '@reactour/tour';
import type { CategoryGroup, RecurringItem, UnmappedCategory } from '../../types';
import {
  getCategoryGroups,
  setConfig,
  getDashboard,
  toggleItemTracking,
  triggerSync,
  linkToCategory,
  getUnmappedCategories,
  linkRollupToCategory,
  createRollupCategory,
} from '../../api/client';
import { LinkCategoryModal, type PendingLink } from '../LinkCategoryModal';
import {
  StepIndicator,
  WizardNavigation,
  PackageIcon,
  EmptyInboxIcon,
  FrequencyGroup,
  formatCurrency,
  wizardTourStyles,
  TourController,
} from './WizardComponents';
import { UI } from '../../constants';

interface RecurringSetupWizardProps {
  onComplete: () => void;
}

// Steps for this wizard
const STEPS = [
  { id: 'category', title: 'Category' },
  { id: 'items', title: 'Items' },
  { id: 'rollup', title: 'Rollup' },
];

// Tour steps for the link icon
const TOUR_STEPS = [
  {
    selector: '[data-tour="link-icon"]',
    content: () => (
      <div>
        <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--monarch-text-dark)' }}>
          Link to Existing Category
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', marginBottom: '12px' }}>
          Already have a category in Monarch for this expense? Click this icon to link to it instead of creating a new one.
        </p>
        <p style={{ fontSize: '13px', color: 'var(--monarch-text-muted)', fontStyle: 'italic' }}>
          This helps keep your existing budget organization intact.
        </p>
      </div>
    ),
    position: 'left' as const,
  },
];

// ============================================================================
// Step Components
// ============================================================================

// Category Selection Step
function CategoryStep({
  groups,
  selectedGroupId,
  onSelectGroup,
  loading,
  onRefresh,
  error,
}: {
  groups: CategoryGroup[];
  selectedGroupId: string;
  onSelectGroup: (id: string, name: string) => void;
  loading: boolean;
  onRefresh: () => void;
  error: string | null;
}) {
  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        Select Category Group
      </h2>
      <p className="mb-6" style={{ color: 'var(--monarch-text-muted)' }}>
        Choose where your recurring savings categories will be created in Monarch Money.
      </p>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center" style={{ color: 'var(--monarch-text-muted)' }}>
          Loading category groups...
        </div>
      ) : groups.length === 0 ? (
        <div className="py-4">
          <p className="mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
            No category groups found. Please create a category group in Monarch Money first.
          </p>
          <a
            href="https://app.monarchmoney.com/settings/categories"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline"
            style={{ color: 'var(--monarch-orange)' }}
          >
            Open Monarch Money Categories Settings
          </a>
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="category-group" className="block text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Default Category Group
            </label>
            <a
              href="https://app.monarchmoney.com/settings/categories"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
              style={{ color: 'var(--monarch-orange)' }}
            >
              Create New
            </a>
          </div>
          <select
            id="category-group"
            value={selectedGroupId}
            onChange={(e) => {
              const group = groups.find((g) => g.id === e.target.value);
              if (group) onSelectGroup(group.id, group.name);
            }}
            className="w-full rounded-lg px-3 py-2"
            style={{
              border: '1px solid var(--monarch-border)',
              backgroundColor: 'var(--monarch-bg-card)',
              color: 'var(--monarch-text-dark)',
            }}
          >
            <option value="">Select a group...</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={onRefresh}
        disabled={loading}
        className="text-sm px-3 py-1 rounded transition-colors hover:underline"
        style={{ color: 'var(--monarch-orange)' }}
      >
        {loading ? 'Refreshing...' : 'Refresh groups'}
      </button>
    </div>
  );
}

// Item Selection Step
function ItemSelectionStep({
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
}: {
  items: RecurringItem[];
  selectedIds: Set<string>;
  pendingLinks: Map<string, PendingLink>;
  onToggleItem: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
  onToggleGroup: (ids: string[], select: boolean) => void;
  onLinkClick: (item: RecurringItem) => void;
  onUnlink: (itemId: string) => void;
  categoryGroupName: string;
  onChangeGroup: () => void;
}) {
  // Group items by frequency
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
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

// Rollup Configuration Step
function RollupConfigStep({
  mode,
  onModeChange,
  categories,
  selectedCategoryId,
  onCategorySelect,
  syncName,
  onSyncNameChange,
  loading,
  groupName,
}: {
  mode: 'new' | 'existing';
  onModeChange: (mode: 'new' | 'existing') => void;
  categories: UnmappedCategory[];
  selectedCategoryId: string;
  onCategorySelect: (id: string) => void;
  syncName: boolean;
  onSyncNameChange: (sync: boolean) => void;
  loading: boolean;
  groupName: string;
}) {
  // Group categories by group_name for dropdown
  const groupedCategories = categories.reduce((acc, cat) => {
    const group = cat.group_name || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(cat);
    return acc;
  }, {} as Record<string, UnmappedCategory[]>);

  return (
    <div className="text-center animate-fade-in">
      <div className="mb-4 flex justify-center">
        <PackageIcon size={48} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        The Rollup Category
      </h2>
      <p className="mb-6" style={{ color: 'var(--monarch-text-muted)' }}>
        The rollup is a single catch-all category for smaller recurring charges. Would you like to use an existing category or create a new one?
      </p>

      {/* Mode selection */}
      <div className="space-y-3 mb-6">
        {/* Create new option */}
        <label
          className="flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all"
          style={{
            backgroundColor: mode === 'new' ? 'rgba(255, 105, 45, 0.08)' : 'var(--monarch-bg-page)',
            border: mode === 'new' ? '2px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
          }}
        >
          <input
            type="radio"
            name="rollupMode"
            checked={mode === 'new'}
            onChange={() => onModeChange('new')}
            className="mt-1"
            style={{ accentColor: 'var(--monarch-orange)' }}
          />
          <div className="text-left">
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Create new category
            </div>
            <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              A new "Recurring Rollup" category will be created in <strong>{groupName}</strong>
            </div>
          </div>
        </label>

        {/* Use existing option */}
        <label
          className="flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all"
          style={{
            backgroundColor: mode === 'existing' ? 'rgba(255, 105, 45, 0.08)' : 'var(--monarch-bg-page)',
            border: mode === 'existing' ? '2px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
          }}
        >
          <input
            type="radio"
            name="rollupMode"
            checked={mode === 'existing'}
            onChange={() => onModeChange('existing')}
            className="mt-1"
            style={{ accentColor: 'var(--monarch-orange)' }}
          />
          <div className="text-left flex-1">
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Use existing category
            </div>
            <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              Link the rollup to a category you already have in Monarch
            </div>
          </div>
        </label>
      </div>

      {/* Category selection (when existing mode) */}
      {mode === 'existing' && (
        <div
          className="rounded-lg p-4 text-left mb-6"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          {loading ? (
            <div className="text-center py-4" style={{ color: 'var(--monarch-text-muted)' }}>
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-4" style={{ color: 'var(--monarch-text-muted)' }}>
              No available categories found
            </div>
          ) : (
            <>
              <label className="block mb-2 text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                Select a category:
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => onCategorySelect(e.target.value)}
                className="w-full p-3 rounded-lg mb-3"
                style={{
                  backgroundColor: 'var(--monarch-bg-card)',
                  border: '1px solid var(--monarch-border)',
                  color: 'var(--monarch-text-dark)',
                }}
              >
                <option value="">Choose a category...</option>
                {Object.entries(groupedCategories).map(([gName, cats]) => (
                  <optgroup key={gName} label={gName}>
                    {cats.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon ? `${cat.icon} ` : ''}{cat.name} — ${cat.planned_budget || 0} budgeted
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncName}
                  onChange={(e) => onSyncNameChange(e.target.checked)}
                  style={{ accentColor: 'var(--monarch-orange)' }}
                />
                <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                  Rename category to "Recurring Rollup"
                </span>
              </label>
            </>
          )}
        </div>
      )}

      <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
        You can configure which items go into the rollup from the dashboard after setup.
      </p>
    </div>
  );
}

// ============================================================================
// Main Wizard Component
// ============================================================================

export function RecurringSetupWizard({ onComplete }: RecurringSetupWizardProps) {
  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // Category group state
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedGroupName, setSelectedGroupName] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupsFetched, setGroupsFetched] = useState(false);

  // Items state
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [itemsFetched, setItemsFetched] = useState(false);

  // Linking state
  const [pendingLinks, setPendingLinks] = useState<Map<string, PendingLink>>(new Map());
  const [linkModalItem, setLinkModalItem] = useState<RecurringItem | null>(null);

  // Tour state
  const [showLinkTour, setShowLinkTour] = useState(false);
  const [linkTourShown, setLinkTourShown] = useState(false);

  // Rollup tip state
  const [rollupTipShown, setRollupTipShown] = useState(false);
  const [showRollupTip, setShowRollupTip] = useState(false);

  // Rollup configuration state
  const [rollupMode, setRollupMode] = useState<'new' | 'existing'>('new');
  const [rollupCategories, setRollupCategories] = useState<UnmappedCategory[]>([]);
  const [selectedRollupCategoryId, setSelectedRollupCategoryId] = useState('');
  const [rollupSyncName, setRollupSyncName] = useState(true);
  const [loadingRollupCategories, setLoadingRollupCategories] = useState(false);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch category groups
  const fetchGroups = async () => {
    setLoadingGroups(true);
    setGroupError(null);
    try {
      const data = await getCategoryGroups();
      setGroups(data);
      setGroupsFetched(true);
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoadingGroups(false);
    }
  };

  // Fetch recurring items
  const fetchItems = async () => {
    setLoadingItems(true);
    setItemsError(null);
    try {
      const data = await getDashboard();
      const availableItems = data.items.filter((item) => !item.is_enabled);
      setItems(availableItems);
      setItemsFetched(true);
    } catch (err) {
      setItemsError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoadingItems(false);
    }
  };

  // Load groups when entering category step
  useEffect(() => {
    if (currentStep === 0 && !groupsFetched && !loadingGroups && !groupError) {
      fetchGroups();
    }
  }, [currentStep, groupsFetched, loadingGroups, groupError]);

  // Load items when entering items step
  useEffect(() => {
    if (currentStep === 1 && !itemsFetched && !loadingItems && !itemsError) {
      fetchItems();
    }
  }, [currentStep, itemsFetched, loadingItems, itemsError]);

  // Fetch rollup categories when entering rollup step
  const fetchRollupCategories = async () => {
    setLoadingRollupCategories(true);
    try {
      const categories = await getUnmappedCategories();
      setRollupCategories(categories);
    } catch {
      // Silently fail - the dropdown will show empty state
    } finally {
      setLoadingRollupCategories(false);
    }
  };

  // Load rollup categories when entering rollup step
  useEffect(() => {
    if (currentStep === 2 && rollupCategories.length === 0 && !loadingRollupCategories) {
      fetchRollupCategories();
    }
  }, [currentStep, rollupCategories.length, loadingRollupCategories]);

  // Check if can proceed
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!selectedGroupId;
      case 1:
        return true; // Item selection is optional
      case 2:
        // Rollup config - if existing mode, must select a category
        return rollupMode === 'new' || !!selectedRollupCategoryId;
      default:
        return false;
    }
  };

  // Handle group selection
  const handleSelectGroup = (id: string, name: string) => {
    setSelectedGroupId(id);
    setSelectedGroupName(name);
  };

  // Handle item toggle
  const handleToggleItem = useCallback((id: string) => {
    const item = items.find(i => i.id === id);

    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      const wasEmpty = prev.size === 0;

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);

        // Show link tour on first item selection
        if (wasEmpty && !linkTourShown) {
          setTimeout(() => {
            setShowLinkTour(true);
            setLinkTourShown(true);
          }, UI.ANIMATION.NORMAL);
        }

        // Show rollup tip for small items
        if (item && item.amount < 60 && !rollupTipShown) {
          setRollupTipShown(true);
          setShowRollupTip(true);
        }
      }
      return next;
    });
  }, [items, linkTourShown, rollupTipShown]);

  // Handle select all
  const handleSelectAll = () => {
    setSelectedItemIds(new Set(items.map((item) => item.id)));
    if (!rollupTipShown && items.some(item => item.amount < 60)) {
      setRollupTipShown(true);
      setShowRollupTip(true);
    }
  };

  // Handle deselect all
  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  // Handle toggle group
  const handleToggleGroup = (ids: string[], select: boolean) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (select) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  };

  // Handle refresh items
  const handleRefreshItems = async () => {
    setLoadingItems(true);
    setItemsError(null);
    setItemsFetched(false);
    try {
      await triggerSync();
      const data = await getDashboard();
      const availableItems = data.items.filter((item) => !item.is_enabled);
      setItems(availableItems);
      setItemsFetched(true);
    } catch (err) {
      setItemsError(err instanceof Error ? err.message : 'Failed to refresh items');
    } finally {
      setLoadingItems(false);
    }
  };

  // Handle link modal
  const handleOpenLinkModal = (item: RecurringItem) => {
    setLinkModalItem(item);
  };

  const handleLinkSuccess = (link?: PendingLink) => {
    if (link && linkModalItem) {
      setPendingLinks((prev) => {
        const next = new Map(prev);
        next.set(linkModalItem.id, link);
        return next;
      });
    }
    setLinkModalItem(null);
  };

  const handleUnlink = (itemId: string) => {
    setPendingLinks((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  };

  // Handle going back to category step
  const handleChangeGroup = () => {
    setCurrentStep(0);
  };

  // Handle completion
  const handleComplete = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      // Save the category group config
      if (selectedGroupId && selectedGroupName) {
        await setConfig(selectedGroupId, selectedGroupName);
      }

      // Set up rollup category based on user choice
      if (rollupMode === 'existing' && selectedRollupCategoryId) {
        // Link to existing category - inherits its budget
        await linkRollupToCategory(selectedRollupCategoryId, rollupSyncName);
      } else {
        // Create new rollup category with $0 budget
        await createRollupCategory(0);
      }

      // Save pending category links
      const linkPromises = Array.from(pendingLinks.entries()).map(([itemId, link]) =>
        linkToCategory(itemId, link.categoryId, link.syncName).catch((err) => ({
          itemId,
          error: err instanceof Error ? err.message : 'Failed to link',
        }))
      );

      await Promise.all(linkPromises);

      // Enable selected items (that aren't linked)
      // Use $0 initial budget for newly created categories
      const linkedItemIds = new Set(pendingLinks.keys());
      const enablePromises = Array.from(selectedItemIds)
        .filter((id) => !linkedItemIds.has(id))
        .map((id) =>
          toggleItemTracking(id, true, { initialBudget: 0 }).catch((err) => ({
            id,
            error: err instanceof Error ? err.message : 'Failed',
          }))
        );

      await Promise.all(enablePromises);

      // Complete the wizard
      onComplete();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save configuration');
      setSaving(false);
    }
  };

  // Handle skip
  const handleSkip = async () => {
    setSaving(true);
    try {
      if (selectedGroupId && selectedGroupName) {
        await setConfig(selectedGroupId, selectedGroupName);
      }
      onComplete();
    } catch {
      onComplete();
    }
  };

  // Handle next
  const handleNext = () => {
    if (currentStep === STEPS.length - 1) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  // Handle back
  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  // Render current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <CategoryStep
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={handleSelectGroup}
            loading={loadingGroups}
            onRefresh={fetchGroups}
            error={groupError}
          />
        );
      case 1:
        return (
          <ItemSelectionStep
            items={items}
            selectedIds={selectedItemIds}
            pendingLinks={pendingLinks}
            onToggleItem={handleToggleItem}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onRefresh={handleRefreshItems}
            loading={loadingItems}
            error={itemsError}
            onToggleGroup={handleToggleGroup}
            onLinkClick={handleOpenLinkModal}
            onUnlink={handleUnlink}
            categoryGroupName={selectedGroupName}
            onChangeGroup={handleChangeGroup}
          />
        );
      case 2:
        return (
          <RollupConfigStep
            mode={rollupMode}
            onModeChange={setRollupMode}
            categories={rollupCategories}
            selectedCategoryId={selectedRollupCategoryId}
            onCategorySelect={setSelectedRollupCategoryId}
            syncName={rollupSyncName}
            onSyncNameChange={setRollupSyncName}
            loading={loadingRollupCategories}
            groupName={selectedGroupName}
          />
        );
      default:
        return null;
    }
  };

  return (
    <TourProvider
      steps={TOUR_STEPS}
      styles={wizardTourStyles}
      showNavigation={false}
      showBadge={false}
      disableInteraction
      onClickMask={() => setShowLinkTour(false)}
      onClickClose={() => setShowLinkTour(false)}
      scrollSmooth
    >
      <TourController isOpen={showLinkTour} onClose={() => setShowLinkTour(false)} />
      <div className="flex items-center justify-center p-4">
        <div
          className="rounded-xl shadow-lg w-full max-w-lg p-6"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <StepIndicator steps={STEPS} currentStep={currentStep} />

          {saveError && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
            >
              {saveError}
            </div>
          )}

          {renderStepContent()}

          <WizardNavigation
            onBack={handleBack}
            onNext={handleNext}
            onSkip={handleSkip}
            canGoBack={currentStep > 0}
            canProceed={canProceed()}
            isLastStep={currentStep === STEPS.length - 1}
            isSaving={saving}
            nextLabel={currentStep === STEPS.length - 1 ? 'Finish Setup' : undefined}
          />
        </div>

        {/* Link Category Modal */}
        {linkModalItem && (
          <LinkCategoryModal
            item={linkModalItem}
            isOpen={!!linkModalItem}
            onClose={() => setLinkModalItem(null)}
            onSuccess={handleLinkSuccess}
            deferSave={true}
            reservedCategories={new Map(
              Array.from(pendingLinks.entries()).map(([itemId, link]) => {
                const linkedItem = items.find(i => i.id === itemId);
                const itemName = linkedItem?.merchant_name || linkedItem?.name || 'Unknown item';
                return [link.categoryId, itemName];
              })
            )}
          />
        )}

        {/* Rollup tip modal */}
        {showRollupTip && (
          <>
            <div
              className="fixed inset-0 z-(--z-index-modal-backdrop)"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            />
            <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center p-4">
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: 'var(--monarch-bg-card)',
                  border: '1px solid var(--monarch-border)',
                  maxWidth: '340px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                }}
              >
                <div className="font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
                  Here's a tip!
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
                  Smaller recurring items can be left unchecked here and combined into a shared rollup category in the next step.
                </p>
                <button
                  onClick={() => setShowRollupTip(false)}
                  className="w-full py-2 px-4 rounded-lg text-sm font-medium hover-bg-orange-to-orange-hover"
                  style={{ color: 'white' }}
                >
                  Got it
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </TourProvider>
  );
}
