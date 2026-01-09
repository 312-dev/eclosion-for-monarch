import { useState, useEffect, useMemo } from 'react';
import type { UnmappedCategory, RecurringItem } from '../types';
import { getUnmappedCategories, linkToCategory } from '../api/client';
import { useToast } from '../context/ToastContext';
import { handleApiError } from '../utils';
import { Portal } from './Portal';

export interface PendingLink {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | undefined;
  syncName: boolean;
}

interface LinkCategoryModalProps {
  item: RecurringItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (link?: PendingLink) => void;
  /** If true, don't save to DB - return data via onSuccess instead */
  deferSave?: boolean;
  /** Map of category IDs to the item names they're already linked to */
  reservedCategories?: Map<string, string>;
}

export function LinkCategoryModal({ item, isOpen, onClose, onSuccess, deferSave = false, reservedCategories = new Map() }: LinkCategoryModalProps) {
  const [categories, setCategories] = useState<UnmappedCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [syncName, setSyncName] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setSelectedCategory('');
      setSyncName(true);
      setSearchQuery('');
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUnmappedCategories();
      setCategories(data);
    } catch (err) {
      setError(handleApiError(err, 'Loading categories'));
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!selectedCategory) return;

    const selectedCat = categories.find(c => c.id === selectedCategory);

    // In deferred mode, just return the data without saving
    if (deferSave) {
      onSuccess({
        categoryId: selectedCategory,
        categoryName: selectedCat?.name || '',
        categoryIcon: selectedCat?.icon,
        syncName,
      });
      onClose();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await linkToCategory(item.id, selectedCategory, syncName);
      if (result.success) {
        toast.success('Category linked successfully');
        onSuccess();
        onClose();
      } else {
        const errorMsg = result.error || 'Failed to link category';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = handleApiError(err, 'Linking category');
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Group and filter categories with memoization to prevent recalculation on every render
  const filteredGroups = useMemo(() => {
    // Group categories by group_id while preserving budget order
    const grouped = categories.reduce((acc, cat) => {
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
    }, {} as Record<string, { groupId: string; groupName: string; groupOrder: number; categories: UnmappedCategory[] }>);

    // Convert to array and sort by group_order (budget sheet order)
    const sorted = Object.values(grouped)
      .sort((a, b) => a.groupOrder - b.groupOrder);

    // Filter by search query (keep reserved categories but they'll be shown as disabled)
    const searchLower = searchQuery.toLowerCase();
    return sorted
      .map(group => ({
        ...group,
        categories: group.categories
          .filter(cat =>
            cat.name.toLowerCase().includes(searchLower) ||
            group.groupName.toLowerCase().includes(searchLower)
          ),
      }))
      .filter(group => group.categories.length > 0);
  }, [categories, searchQuery]);

  const selectedCategoryInfo = categories.find(c => c.id === selectedCategory);

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 modal-backdrop"
          onClick={onClose}
        />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 rounded-xl shadow-xl max-h-[80vh] flex flex-col modal-content bg-monarch-bg-card border border-monarch-border">
        {/* Header */}
        <div className="p-4 border-b border-monarch-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-monarch-text-dark">
              Link to Existing Category
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 transition-colors text-monarch-text-muted"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm mt-1 text-monarch-text-muted">
            Link <strong>{item.name}</strong> to an existing budget category
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm error-message bg-monarch-error-bg text-monarch-error">
              {error}
            </div>
          )}

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border border-monarch-border bg-monarch-bg-card text-monarch-text-dark"
            />
          </div>

          {/* Category List */}
          {loading ? (
            <div className="text-center py-8 text-monarch-text-muted">
              Loading categories...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-monarch-text-muted">
              {searchQuery ? 'No categories match your search' : 'No unmapped categories available'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <div key={group.groupId}>
                  <div className="text-xs font-medium uppercase tracking-wide mb-2 text-monarch-text-muted">
                    {group.groupName}
                  </div>
                  <div className="space-y-1">
                    {group.categories.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      const linkedToItem = reservedCategories.get(cat.id);
                      const isReserved = !!linkedToItem;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => !isReserved && setSelectedCategory(cat.id)}
                          disabled={isReserved}
                          className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2"
                          style={{
                            backgroundColor: isReserved ? 'var(--monarch-bg-page)' : isSelected ? 'rgba(255, 105, 45, 0.1)' : 'var(--monarch-bg-page)',
                            color: isReserved ? 'var(--monarch-text-muted)' : 'var(--monarch-text-dark)',
                            borderLeft: isSelected && !isReserved ? '3px solid var(--monarch-orange)' : '3px solid transparent',
                            boxShadow: isSelected && !isReserved ? '0 2px 8px rgba(255, 105, 45, 0.15)' : 'none',
                            opacity: isReserved ? 0.6 : 1,
                            cursor: isReserved ? 'not-allowed' : 'pointer',
                          }}
                          title={isReserved ? `Already linked to "${linkedToItem}"` : undefined}
                        >
                          {cat.icon && <span className="text-base">{cat.icon}</span>}
                          <span className="flex-1">{cat.name}</span>
                          {isReserved && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--monarch-bg-card)', color: 'var(--monarch-text-muted)' }}>
                              Linked
                            </span>
                          )}
                          {isSelected && !isReserved && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sync Name Option */}
          {selectedCategory && (
            <div className="mt-6 p-4 rounded-lg bg-monarch-bg-page">
              <div className="text-sm font-medium mb-3 text-monarch-text-dark">
                Category Name Preference
              </div>
              <div className="space-y-3">
                <label
                  className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg transition-all ${syncName ? 'bg-monarch-orange/8 border border-monarch-orange' : 'border border-transparent'}`}
                >
                  <input
                    type="radio"
                    name="syncName"
                    checked={syncName}
                    onChange={() => setSyncName(true)}
                    className="mt-0.5 focus:outline-none accent-monarch-orange"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-monarch-text-dark">
                      Rename to match recurring item
                    </div>
                    <div className="text-xs mt-1 text-monarch-text-muted">
                      {selectedCategoryInfo?.icon && <span className="mr-1">{selectedCategoryInfo.icon}</span>}
                      {selectedCategoryInfo?.name}
                      <span className="mx-2">→</span>
                      <strong className="text-monarch-orange">{item.category_name || item.name}</strong>
                    </div>
                  </div>
                </label>
                <label
                  className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg transition-all border ${syncName ? 'border-transparent' : 'bg-monarch-orange/8 border-monarch-orange'}`}
                >
                  <input
                    type="radio"
                    name="syncName"
                    checked={!syncName}
                    onChange={() => setSyncName(false)}
                    className="mt-0.5 focus:outline-none accent-monarch-orange"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-monarch-text-dark">
                      Keep existing name
                    </div>
                    <div className="text-xs mt-1 text-monarch-text-muted">
                      {selectedCategoryInfo?.icon && <span className="mr-1">{selectedCategoryInfo.icon}</span>}
                      <strong>{selectedCategoryInfo?.name}</strong>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-monarch-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm rounded-lg transition-colors btn-hover-lift border border-monarch-border text-monarch-text-dark bg-monarch-bg-card"
          >
            Cancel
          </button>
          <button
            onClick={handleLink}
            disabled={!selectedCategory || saving}
            className={`flex-1 px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-hover-lift ${!selectedCategory || saving ? 'bg-monarch-orange-disabled' : 'bg-monarch-orange'}`}
          >
            {saving ? 'Linking...' : 'Link Category'}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
