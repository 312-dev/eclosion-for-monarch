/**
 * WishlistCategoryModal Component
 *
 * Modal for selecting how to link a wishlist item to a Monarch category.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import {
  useCategoryGroupsList,
  useRefreshCategoryGroups,
  useUnmappedCategoriesList,
} from '../../api/queries';
import { useIsRateLimited } from '../../context/RateLimitContext';
import type { UnmappedCategory } from '../../types/category';
import { CreateNewCategoryView, UseExistingCategoryView } from './WishlistCategoryModalViews';

/** Result of category selection */
export type CategorySelection =
  | { type: 'create_new'; categoryGroupId: string; categoryGroupName: string }
  | { type: 'use_existing'; categoryId: string; categoryName: string };

interface WishlistCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selection: CategorySelection) => void | Promise<void>;
  defaultCategoryGroupId?: string;
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
  const [viewMode, setViewMode] = useState<ViewMode>('create_new');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { groups: categoryGroups, isLoading: groupsLoading } = useCategoryGroupsList();
  const refreshGroups = useRefreshCategoryGroups();
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const {
    categories: unmappedCategories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useUnmappedCategoriesList();

  useEffect(() => {
    if (isOpen) {
      setViewMode('create_new');
      setSelectedGroupId(defaultCategoryGroupId || '');
      setSelectedCategoryId('');
      setSearchQuery('');
    }
  }, [isOpen, defaultCategoryGroupId]);

  const handleRefreshGroups = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshGroups();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshGroups]);

  const filteredGroups = useMemo(() => {
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
    const sorted = Object.values(grouped).sort((a, b) => a.groupOrder - b.groupOrder);
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

  const selectedCategoryInfo = unmappedCategories.find((c) => c.id === selectedCategoryId);
  const selectedGroupName = categoryGroups?.find((g) => g.id === selectedGroupId)?.name || '';

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
        style={{ color: 'var(--monarch-text-muted)', backgroundColor: 'transparent' }}
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
          <CreateNewCategoryView
            selectedGroupId={selectedGroupId}
            onGroupChange={setSelectedGroupId}
            categoryGroups={categoryGroups}
            groupsLoading={groupsLoading}
            isRefreshing={isRefreshing}
            onRefresh={handleRefreshGroups}
            onSwitchView={() => setViewMode('use_existing')}
          />
        ) : (
          <UseExistingCategoryView
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            filteredGroups={filteredGroups}
            categoriesLoading={categoriesLoading}
            categoriesError={categoriesError}
            onSwitchView={() => setViewMode('create_new')}
          />
        )}
      </div>
    </Modal>
  );
}
