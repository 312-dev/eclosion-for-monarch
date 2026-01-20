/**
 * WishlistCategoryModal View Components
 *
 * Extracted view components for creating new or selecting existing categories.
 */

import { Icons } from '../icons';
import { decodeHtmlEntities } from '../../utils';
import type { CategoryGroup, UnmappedCategory } from '../../types/category';

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
}

export function CreateNewCategoryView({
  selectedGroupId,
  onGroupChange,
  categoryGroups,
  groupsLoading,
  isRefreshing,
  onRefresh,
  onSwitchView,
}: CreateNewViewProps) {
  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="wishlist-category-group"
            className="block text-sm font-medium"
            style={{ color: 'var(--monarch-text)' }}
          >
            Category Group
          </label>
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
        <select
          id="wishlist-category-group"
          value={selectedGroupId}
          onChange={(e) => onGroupChange(e.target.value)}
          className="w-full px-3 py-2 rounded-md"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
            color: 'var(--monarch-text)',
          }}
        >
          <option value="">Select a category group...</option>
          {groupsLoading ? (
            <option disabled>Loading...</option>
          ) : (
            categoryGroups?.map((group: CategoryGroup) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))
          )}
        </select>
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
}: UseExistingViewProps) {
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
          {!categoriesLoading && filteredGroups.length === 0 && (
            <div className="text-center py-8" style={{ color: 'var(--monarch-text-muted)' }}>
              {searchQuery ? 'No categories match your search' : 'No available categories'}
            </div>
          )}
          {!categoriesLoading && filteredGroups.length > 0 && (
            <div className="space-y-3 p-2">
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
