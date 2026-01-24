/**
 * StashCategoryModal View Components
 *
 * Extracted view components for creating new or selecting existing categories.
 */

import { Icons } from '../icons';
import { decodeHtmlEntities } from '../../utils';
import { SearchableSelect } from '../SearchableSelect';
import type { SelectOption } from '../SearchableSelect';
import type { CategoryGroup, CategoryGroupDetailed, UnmappedCategory } from '../../types/category';

interface GroupedCategories {
  groupId: string;
  groupName: string;
  groupOrder: number;
  categories: UnmappedCategory[];
}

interface CreateNewViewProps {
  selectedGroupId: string;
  onGroupChange: (id: string) => void;
  categoryGroups: CategoryGroup[] | undefined;
  groupsLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onSwitchView: () => void;
  /** IDs of flexible/rollover groups that should be disabled */
  flexibleGroupIds?: Set<string>;
}

export function CreateNewCategoryView({
  selectedGroupId,
  onGroupChange,
  categoryGroups,
  groupsLoading,
  isRefreshing,
  onRefresh,
  onSwitchView,
  flexibleGroupIds = new Set(),
}: CreateNewViewProps) {
  // Build options for SearchableSelect, marking flexible groups as disabled
  const options: SelectOption[] = (categoryGroups ?? []).map((group) => {
    const isFlexible = flexibleGroupIds.has(group.id);
    const option: SelectOption = {
      value: group.id,
      label: decodeHtmlEntities(group.name),
      disabled: isFlexible,
    };
    if (isFlexible) {
      option.disabledReason =
        'This group uses flexible rollover budgeting. Select it in "Use existing category" instead.';
    }
    return option;
  });

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span
            id="stash-category-group-label"
            className="block text-sm font-medium"
            style={{ color: 'var(--monarch-text)' }}
          >
            Category Group
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1 rounded hover:bg-(--monarch-bg-page)"
            aria-label="Refresh category groups"
          >
            <Icons.Refresh
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ color: 'var(--monarch-text-muted)' }}
            />
          </button>
        </div>
        <SearchableSelect
          value={selectedGroupId}
          onChange={onGroupChange}
          options={options}
          placeholder="Select a category group..."
          searchPlaceholder="Search groups..."
          loading={groupsLoading}
          aria-labelledby="stash-category-group-label"
          insideModal
        />
        <p className="mt-2 text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
          A new category will be created in this group to track your savings.
        </p>
      </div>
      <div className="pt-2 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
        <button
          type="button"
          onClick={onSwitchView}
          className="text-sm flex items-center gap-1 hover:underline"
          style={{ color: 'var(--monarch-teal)' }}
        >
          Or use an existing category
          <Icons.ChevronRight size={14} />
        </button>
      </div>
    </>
  );
}

interface UseExistingViewProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  filteredGroups: GroupedCategories[];
  categoriesLoading: boolean;
  categoriesError: Error | null;
  onSwitchView: () => void;
  // Flexible category groups
  flexibleGroups: CategoryGroupDetailed[];
  selectedFlexibleGroupId: string;
  onSelectFlexibleGroup: (id: string) => void;
}

export function UseExistingCategoryView({
  searchQuery,
  onSearchChange,
  selectedCategoryId,
  onSelectCategory,
  filteredGroups,
  categoriesLoading,
  categoriesError,
  onSwitchView,
  flexibleGroups,
  selectedFlexibleGroupId,
  onSelectFlexibleGroup,
}: UseExistingViewProps) {
  // Filter flexible groups by search query
  const filteredFlexibleGroups = flexibleGroups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
            color: 'var(--monarch-text)',
          }}
        />

        {categoriesError && (
          <div
            className="p-3 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
          >
            Failed to load categories
          </div>
        )}

        <div
          className="max-h-64 overflow-y-auto rounded-lg"
          style={{ backgroundColor: 'var(--monarch-bg-card)' }}
        >
          {categoriesLoading && (
            <div className="text-center py-8" style={{ color: 'var(--monarch-text-muted)' }}>
              Loading categories...
            </div>
          )}
          {!categoriesLoading &&
            filteredGroups.length === 0 &&
            filteredFlexibleGroups.length === 0 && (
              <div className="text-center py-8" style={{ color: 'var(--monarch-text-muted)' }}>
                {searchQuery ? 'No categories match your search' : 'No available categories'}
              </div>
            )}
          {!categoriesLoading &&
            (filteredGroups.length > 0 || filteredFlexibleGroups.length > 0) && (
              <div className="space-y-3 p-2">
                {/* Rollover Groups Section - groups with group-level rollover tracking */}
                {filteredFlexibleGroups.length > 0 && (
                  <div>
                    <div
                      className="text-xs font-medium uppercase tracking-wide mb-1 px-1"
                      style={{ color: 'var(--monarch-text-muted)' }}
                    >
                      Rollover Groups
                    </div>
                    <div className="space-y-1">
                      {filteredFlexibleGroups.map((group) => {
                        const isSelected = selectedFlexibleGroupId === group.id;
                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => onSelectFlexibleGroup(group.id)}
                            className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2"
                            style={{
                              backgroundColor: isSelected
                                ? 'rgba(26, 183, 165, 0.1)'
                                : 'var(--monarch-bg-page)',
                              color: 'var(--monarch-text-dark)',
                              borderLeft: isSelected
                                ? '3px solid var(--monarch-teal)'
                                : '3px solid transparent',
                              boxShadow: isSelected ? '0 2px 8px rgba(26, 183, 165, 0.15)' : 'none',
                            }}
                          >
                            <Icons.Folder
                              size={16}
                              style={{ color: 'var(--monarch-text-muted)' }}
                            />
                            <span className="flex-1">{decodeHtmlEntities(group.name)}</span>
                            {isSelected && (
                              <Icons.Check size={16} style={{ color: 'var(--monarch-teal)' }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Individual Categories Section */}
                {filteredGroups.map((group) => (
                  <div key={group.groupId}>
                    <div
                      className="text-xs font-medium uppercase tracking-wide mb-1 px-1"
                      style={{ color: 'var(--monarch-text-muted)' }}
                    >
                      {decodeHtmlEntities(group.groupName)}
                    </div>
                    <div className="space-y-1">
                      {group.categories.map((cat) => {
                        const isSelected = selectedCategoryId === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => onSelectCategory(cat.id)}
                            className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2"
                            style={{
                              backgroundColor: isSelected
                                ? 'rgba(26, 183, 165, 0.1)'
                                : 'var(--monarch-bg-page)',
                              color: 'var(--monarch-text-dark)',
                              borderLeft: isSelected
                                ? '3px solid var(--monarch-teal)'
                                : '3px solid transparent',
                              boxShadow: isSelected ? '0 2px 8px rgba(26, 183, 165, 0.15)' : 'none',
                            }}
                          >
                            {cat.icon && <span className="text-base">{cat.icon}</span>}
                            <span className="flex-1">{decodeHtmlEntities(cat.name)}</span>
                            {isSelected && (
                              <Icons.Check size={16} style={{ color: 'var(--monarch-teal)' }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
      <div className="pt-2 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
        <button
          type="button"
          onClick={onSwitchView}
          className="text-sm flex items-center gap-1 hover:underline"
          style={{ color: 'var(--monarch-teal)' }}
        >
          <Icons.ChevronLeft size={14} />
          Back to create new
        </button>
      </div>
    </>
  );
}
