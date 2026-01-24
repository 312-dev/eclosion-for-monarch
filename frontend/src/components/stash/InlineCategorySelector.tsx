/**
 * InlineCategorySelector Component
 *
 * Compact inline category selector for the New Stash form.
 * Allows users to either create a new category in a group or use an existing one.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Icons } from '../icons';
import { decodeHtmlEntities } from '../../utils';
import { SearchableSelect } from '../SearchableSelect';
import type { SelectOption, SelectGroup } from '../SearchableSelect';
import {
  useCategoryGroupsList,
  useRefreshCategoryGroups,
  useUnmappedCategoriesList,
  useFlexibleCategoryGroups,
  useRefreshFlexibleCategoryGroups,
} from '../../api/queries';
import type { UnmappedCategory } from '../../types/category';

export type CategorySelectionMode = 'create_new' | 'use_existing';

export interface CategorySelectionResult {
  mode: CategorySelectionMode;
  /** For create_new: the group ID */
  categoryGroupId?: string;
  /** For create_new: the group name */
  categoryGroupName?: string;
  /** For use_existing: the category ID */
  categoryId?: string;
  /** For use_existing: the category name */
  categoryName?: string;
  /** For use_flexible_group: the group ID */
  flexibleGroupId?: string;
  /** For use_flexible_group: the group name */
  flexibleGroupName?: string;
}

interface InlineCategorySelectorProps {
  /** Current selection */
  readonly value: CategorySelectionResult;
  /** Called when selection changes */
  readonly onChange: (selection: CategorySelectionResult) => void;
  /** Default category group ID from config */
  readonly defaultCategoryGroupId?: string | undefined;
}

export function InlineCategorySelector({
  value,
  onChange,
  defaultCategoryGroupId,
}: InlineCategorySelectorProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data fetching
  const { groups: categoryGroups, isLoading: groupsLoading } = useCategoryGroupsList();
  const refreshGroups = useRefreshCategoryGroups();
  const { categories: unmappedCategories, isLoading: categoriesLoading } =
    useUnmappedCategoriesList();
  const { groups: flexibleGroups, isLoading: flexibleGroupsLoading } = useFlexibleCategoryGroups();
  const refreshFlexibleGroups = useRefreshFlexibleCategoryGroups();

  // Get IDs of flexible groups for filtering
  const flexibleGroupIds = useMemo(
    () => new Set(flexibleGroups.map((g) => g.id)),
    [flexibleGroups]
  );

  // Set default group on mount if provided and no selection
  useEffect(() => {
    if (defaultCategoryGroupId && !value.categoryGroupId && value.mode === 'create_new') {
      const group = categoryGroups?.find((g) => g.id === defaultCategoryGroupId);
      if (group) {
        onChange({
          mode: 'create_new',
          categoryGroupId: defaultCategoryGroupId,
          categoryGroupName: group.name,
        });
      }
    }
  }, [defaultCategoryGroupId, categoryGroups, value.categoryGroupId, value.mode, onChange]);

  // Refresh flexible groups on mount
  useEffect(() => {
    refreshFlexibleGroups();
  }, [refreshFlexibleGroups]);

  // Filter categories for "use existing" mode
  // Group categories by their category group (excluding flexible groups)
  const groupedCategories = useMemo(() => {
    const grouped = unmappedCategories.reduce(
      (acc, cat) => {
        const groupId = cat.group_id || 'uncategorized';
        // Skip categories belonging to flexible groups
        if (flexibleGroupIds.has(groupId)) {
          return acc;
        }
        acc[groupId] ??= {
          groupId,
          groupName: cat.group_name || 'Uncategorized',
          groupOrder: cat.group_order,
          categories: [],
        };
        acc[groupId].categories.push(cat);
        return acc;
      },
      {} as Record<
        string,
        { groupId: string; groupName: string; groupOrder: number; categories: UnmappedCategory[] }
      >
    );
    return Object.values(grouped).sort((a, b) => a.groupOrder - b.groupOrder);
  }, [unmappedCategories, flexibleGroupIds]);

  // Build options for category group dropdown (Create New mode)
  const groupOptions: SelectOption[] = useMemo(
    () =>
      (categoryGroups ?? []).map((group) => {
        const isFlexible = flexibleGroupIds.has(group.id);
        const option: SelectOption = {
          value: group.id,
          label: decodeHtmlEntities(group.name),
          disabled: isFlexible,
        };
        if (isFlexible) {
          option.disabledReason = 'Uses flexible rollover. Select in "Use existing" instead.';
        }
        return option;
      }),
    [categoryGroups, flexibleGroupIds]
  );

  // Build grouped options for existing categories dropdown (Use Existing mode)
  // Uses prefixes to distinguish between flexible groups and categories
  const existingGroups: SelectGroup[] = useMemo(() => {
    const groups: SelectGroup[] = [];

    // Add flexible groups first
    if (flexibleGroups.length > 0) {
      groups.push({
        label: 'Rollover Groups',
        options: flexibleGroups.map((group) => ({
          value: `flex:${group.id}`,
          label: `📁 ${decodeHtmlEntities(group.name)}`,
        })),
      });
    }

    // Add individual categories grouped by their category group
    groupedCategories.forEach((group) => {
      groups.push({
        label: decodeHtmlEntities(group.groupName),
        options: group.categories.map((cat) => ({
          value: `cat:${cat.id}`,
          label: cat.icon
            ? `${cat.icon} ${decodeHtmlEntities(cat.name)}`
            : decodeHtmlEntities(cat.name),
        })),
      });
    });

    return groups;
  }, [flexibleGroups, groupedCategories]);

  // Get current value for existing category dropdown
  const existingValue = useMemo(() => {
    if (value.flexibleGroupId) return `flex:${value.flexibleGroupId}`;
    if (value.categoryId) return `cat:${value.categoryId}`;
    return '';
  }, [value.flexibleGroupId, value.categoryId]);

  // Handle selection from existing categories dropdown
  const handleExistingChange = useCallback(
    (selectedValue: string) => {
      if (selectedValue.startsWith('flex:')) {
        const groupId = selectedValue.slice(5);
        const group = flexibleGroups.find((g) => g.id === groupId);
        onChange({
          mode: 'use_existing',
          flexibleGroupId: groupId,
          flexibleGroupName: group?.name || '',
        });
      } else if (selectedValue.startsWith('cat:')) {
        const categoryId = selectedValue.slice(4);
        const cat = unmappedCategories.find((c) => c.id === categoryId);
        onChange({
          mode: 'use_existing',
          categoryId,
          categoryName: cat?.name || '',
        });
      }
    },
    [flexibleGroups, unmappedCategories, onChange]
  );

  const handleRefreshGroups = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshGroups();
      await refreshFlexibleGroups();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshGroups, refreshFlexibleGroups]);

  const handleGroupChange = useCallback(
    (groupId: string) => {
      const group = categoryGroups?.find((g) => g.id === groupId);
      onChange({
        mode: 'create_new',
        categoryGroupId: groupId,
        categoryGroupName: group?.name || '',
      });
    },
    [categoryGroups, onChange]
  );

  const handleModeSwitch = useCallback(
    (mode: CategorySelectionMode) => {
      if (mode === 'create_new') {
        // Restore default group if available
        const group = defaultCategoryGroupId
          ? categoryGroups?.find((g) => g.id === defaultCategoryGroupId)
          : undefined;
        onChange({
          mode: 'create_new',
          categoryGroupId: group?.id || '',
          categoryGroupName: group?.name || '',
        });
      } else {
        onChange({ mode: 'use_existing' });
      }
    },
    [categoryGroups, defaultCategoryGroupId, onChange]
  );

  const isCreateNew = value.mode === 'create_new';
  const isUseExisting = !isCreateNew;

  return (
    <div
      className="rounded-lg p-3"
      style={{
        backgroundColor: 'var(--monarch-bg-page)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      {/* Mode tabs */}
      <div
        className="flex gap-1 mb-3 p-1 rounded-lg"
        style={{
          backgroundColor: 'var(--monarch-bg-hover)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <button
          type="button"
          onClick={() => handleModeSwitch('create_new')}
          className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
            isCreateNew ? 'shadow-sm' : 'hover:bg-monarch-bg-card/50'
          }`}
          style={
            isCreateNew
              ? { backgroundColor: 'var(--monarch-bg-card)', color: 'var(--monarch-text-dark)' }
              : { color: 'var(--monarch-text-muted)' }
          }
        >
          Create New
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch('use_existing')}
          className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
            isUseExisting ? 'shadow-sm' : 'hover:bg-monarch-bg-card/50'
          }`}
          style={
            isUseExisting
              ? { backgroundColor: 'var(--monarch-bg-card)', color: 'var(--monarch-text-dark)' }
              : { color: 'var(--monarch-text-muted)' }
          }
        >
          Use Existing
        </button>
      </div>

      {isCreateNew ? (
        /* Create New Mode */
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchableSelect
              value={value.categoryGroupId || ''}
              onChange={handleGroupChange}
              options={groupOptions}
              placeholder="Select a category group"
              searchPlaceholder="Search groups..."
              loading={groupsLoading}
              aria-label="Category group"
              insideModal
            />
          </div>
          <button
            type="button"
            onClick={handleRefreshGroups}
            disabled={isRefreshing}
            className="p-2 rounded-md hover:bg-monarch-bg-hover"
            style={{ border: '1px solid var(--monarch-border)' }}
            aria-label="Refresh category groups"
          >
            <Icons.Refresh
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ color: 'var(--monarch-text-muted)' }}
            />
          </button>
        </div>
      ) : (
        /* Use Existing Mode */
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchableSelect
              value={existingValue}
              onChange={handleExistingChange}
              groups={existingGroups}
              placeholder="Select an existing category"
              searchPlaceholder="Search categories..."
              loading={categoriesLoading || flexibleGroupsLoading}
              aria-label="Existing category"
              insideModal
            />
          </div>
          <button
            type="button"
            onClick={handleRefreshGroups}
            disabled={isRefreshing}
            className="p-2 rounded-md hover:bg-monarch-bg-hover"
            style={{ border: '1px solid var(--monarch-border)' }}
            aria-label="Refresh categories"
          >
            <Icons.Refresh
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ color: 'var(--monarch-text-muted)' }}
            />
          </button>
        </div>
      )}
    </div>
  );
}
