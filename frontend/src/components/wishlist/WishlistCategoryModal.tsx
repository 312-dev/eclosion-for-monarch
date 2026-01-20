/**
 * WishlistCategoryModal Component
 *
 * Modal for selecting how to link a wishlist item to a Monarch category.
 * Two modes:
 * 1. Create New: Select a category group, creates a new category
 * 2. Use Existing: Pick from available unmapped categories
 *
 * Defaults to "Create New" view with a link to switch to "Use Existing".
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Icons } from '../icons';
import {
  useCategoryGroupsList,
  useRefreshCategoryGroups,
  useUnmappedCategoriesList,
} from '../../api/queries';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { handleApiError, decodeHtmlEntities } from '../../utils';
import type { CategoryGroup, UnmappedCategory } from '../../types/category';

/** Result of category selection */
export type CategorySelection =
  | { type: 'create_new'; categoryGroupId: string; categoryGroupName: string }
  | { type: 'use_existing'; categoryId: string; categoryName: string };

interface WishlistCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selection: CategorySelection) => void | Promise<void>;
  /** Default category group ID from config */
  defaultCategoryGroupId?: string;
  /** Whether the parent form is submitting */
  isSubmitting?: boolean;
}

type ViewMode = 'create_new' | 'use_existing';

export function WishlistCategoryModal({
  isOpen,
  onClose,
  onConfirm,
  defaultCategoryGroupId,
  isSubmitting = false,
}: WishlistCategoryModalProps) {
  const isRateLimited = useIsRateLimited();

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('create_new');

  // Create New state
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { groups: categoryGroups, isLoading: groupsLoading } = useCategoryGroupsList();
  const refreshGroups = useRefreshCategoryGroups();

  // Use Existing state
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const {
    categories: unmappedCategories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useUnmappedCategoriesList();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setViewMode('create_new');
      setSelectedGroupId(defaultCategoryGroupId || '');
      setSelectedCategoryId('');
      setSearchQuery('');
    }
  }, [isOpen, defaultCategoryGroupId]);

  // Handle category group refresh
  const handleRefreshGroups = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshGroups();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshGroups]);

  // Group and filter unmapped categories
  const filteredGroups = useMemo(() => {
    // Group categories by group_id while preserving budget order
    const grouped = unmappedCategories.reduce(
      (acc, cat) => {
        const groupId = cat.group_id || 'uncategorized';
        if (!acc[groupId]) {
          acc[groupId] = {
            groupId,
            groupName: cat.group_name || 'Uncategorized',
            groupOrder: cat.group_order,
            categories: [],
          };
        }
        acc[groupId].categories.push(cat);
        return acc;
      },
      {} as Record<
        string,
        { groupId: string; groupName: string; groupOrder: number; categories: UnmappedCategory[] }
      >
    );

    // Convert to array and sort by group_order (budget sheet order)
    const sorted = Object.values(grouped).sort((a, b) => a.groupOrder - b.groupOrder);

    // Filter by search query
    const searchLower = searchQuery.toLowerCase();
    return sorted
      .map((group) => ({
        ...group,
        categories: group.categories.filter(
          (cat) =>
            cat.name.toLowerCase().includes(searchLower) ||
            group.groupName.toLowerCase().includes(searchLower)
        ),
      }))
      .filter((group) => group.categories.length > 0);
  }, [unmappedCategories, searchQuery]);

  // Get selected category info
  const selectedCategoryInfo = unmappedCategories.find((c) => c.id === selectedCategoryId);

  // Get selected group name
  const selectedGroupName = categoryGroups?.find((g) => g.id === selectedGroupId)?.name || '';

  // Handle confirm
  const handleConfirm = () => {
    if (viewMode === 'create_new') {
      if (!selectedGroupId) return;
      onConfirm({
        type: 'create_new',
        categoryGroupId: selectedGroupId,
        categoryGroupName: selectedGroupName,
      });
    } else {
      if (!selectedCategoryId || !selectedCategoryInfo) return;
      onConfirm({
        type: 'use_existing',
        categoryId: selectedCategoryId,
        categoryName: selectedCategoryInfo.name,
      });
    }
  };

  const isValid =
    viewMode === 'create_new' ? Boolean(selectedGroupId) : Boolean(selectedCategoryId);
  const isDisabled = isSubmitting || isRateLimited || !isValid;

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium rounded-md btn-press"
        style={{
          color: 'var(--monarch-text-muted)',
          backgroundColor: 'transparent',
        }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isDisabled}
        className="px-4 py-2 text-sm font-medium rounded-md btn-press"
        style={{
          backgroundColor: isDisabled ? 'var(--monarch-border)' : 'var(--monarch-teal)',
          color: isDisabled ? 'var(--monarch-text-muted)' : 'white',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
        }}
      >
        {isSubmitting ? 'Creating...' : 'Create Item'}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose Category"
      description={
        viewMode === 'create_new'
          ? 'Select where to create your savings category'
          : 'Link to an existing budget category'
      }
      footer={footer}
      maxWidth="md"
    >
      <div className="space-y-4">
        {viewMode === 'create_new' ? (
          <>
            {/* Create New Category View */}
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
                  onClick={handleRefreshGroups}
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
                onChange={(e) => setSelectedGroupId(e.target.value)}
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
              <p
                className="mt-2 text-xs"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                A new category will be created in this group to track your savings.
              </p>
            </div>

            {/* Switch to Use Existing link */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
              <button
                type="button"
                onClick={() => setViewMode('use_existing')}
                className="text-sm flex items-center gap-1 hover:underline"
                style={{ color: 'var(--monarch-teal)' }}
              >
                Or use an existing category
                <Icons.ChevronRight size={14} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Use Existing Category View */}
            <div className="space-y-3">
              {/* Search */}
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--monarch-bg-page)',
                  border: '1px solid var(--monarch-border)',
                  color: 'var(--monarch-text)',
                }}
              />

              {/* Category error */}
              {categoriesError && (
                <div
                  className="p-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--monarch-error-bg)',
                    color: 'var(--monarch-error)',
                  }}
                >
                  {handleApiError(categoriesError, 'Loading categories')}
                </div>
              )}

              {/* Category List */}
              <div
                className="max-h-64 overflow-y-auto rounded-lg"
                style={{ backgroundColor: 'var(--monarch-bg-card)' }}
              >
                {categoriesLoading && (
                  <div
                    className="text-center py-8"
                    style={{ color: 'var(--monarch-text-muted)' }}
                  >
                    Loading categories...
                  </div>
                )}
                {!categoriesLoading && filteredGroups.length === 0 && (
                  <div
                    className="text-center py-8"
                    style={{ color: 'var(--monarch-text-muted)' }}
                  >
                    {searchQuery
                      ? 'No categories match your search'
                      : 'No available categories'}
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
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2"
                                style={{
                                  backgroundColor: isSelected
                                    ? 'rgba(26, 183, 165, 0.1)'
                                    : 'var(--monarch-bg-page)',
                                  color: 'var(--monarch-text-dark)',
                                  borderLeft: isSelected
                                    ? '3px solid var(--monarch-teal)'
                                    : '3px solid transparent',
                                  boxShadow: isSelected
                                    ? '0 2px 8px rgba(26, 183, 165, 0.15)'
                                    : 'none',
                                }}
                              >
                                {cat.icon && <span className="text-base">{cat.icon}</span>}
                                <span className="flex-1">{decodeHtmlEntities(cat.name)}</span>
                                {isSelected && (
                                  <Icons.Check
                                    size={16}
                                    style={{ color: 'var(--monarch-teal)' }}
                                  />
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

            {/* Switch back to Create New link */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
              <button
                type="button"
                onClick={() => setViewMode('create_new')}
                className="text-sm flex items-center gap-1 hover:underline"
                style={{ color: 'var(--monarch-teal)' }}
              >
                <Icons.ChevronLeft size={14} />
                Back to create new
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
