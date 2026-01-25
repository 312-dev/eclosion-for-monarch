/**
 * Hidden Categories Modal
 *
 * Modal for selecting category groups and categories to hide from the notes view.
 */

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, EyeOff, Eye } from 'lucide-react';
import { Portal } from '../Portal';
import { SingleButtonFooter } from '../ui/ModalButtons';
import { useCategoriesByGroup } from '../../api/queries/categoryStoreQueries';
import { decodeHtmlEntities } from '../../utils';
import type { NotesCategoryGroup } from '../../types/notes';

interface HiddenCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  hiddenGroups: string[];
  hiddenCategories: string[];
  onToggleGroup: (groupId: string) => void;
  onToggleCategory: (categoryId: string) => void;
}

export function HiddenCategoriesModal({
  isOpen,
  onClose,
  hiddenGroups,
  hiddenCategories,
  onToggleGroup,
  onToggleCategory,
}: HiddenCategoriesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Fetch all Monarch categories from the shared category store
  const { data: notesCategories, isLoading: loading, error: queryError } = useCategoriesByGroup();
  const error = queryError ? 'Failed to load categories' : null;

  // Filter groups by search query
  const filteredGroups: NotesCategoryGroup[] = useMemo(() => {
    const categories = notesCategories ?? [];
    if (!searchQuery) return categories;

    const query = searchQuery.toLowerCase();
    return categories
      .map((g) => ({
        ...g,
        categories: g.categories.filter(
          (c) => c.name.toLowerCase().includes(query) || g.name.toLowerCase().includes(query)
        ),
      }))
      .filter((g) => g.name.toLowerCase().includes(query) || g.categories.length > 0);
  }, [notesCategories, searchQuery]);

  const toggleExpanded = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const hiddenCount = hiddenGroups.length + hiddenCategories.length;

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 modal-backdrop" onClick={onClose} />

        {/* Modal */}
        <div
          className="relative w-full max-w-lg mx-4 rounded-xl shadow-xl flex flex-col modal-content bg-monarch-bg-card border border-monarch-border"
          style={{ maxHeight: 'var(--modal-max-height)' }}
        >
          {/* Header */}
          <div
            className="p-4 border-b border-monarch-border rounded-t-xl"
            style={{ backgroundColor: 'var(--monarch-bg-page)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff size={20} style={{ color: 'var(--monarch-orange)' }} />
                <h2 className="text-lg font-semibold text-monarch-text-dark">Hidden Categories</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-(--monarch-bg-hover) transition-colors text-monarch-text-muted"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <p className="text-sm mt-1 text-monarch-text-muted">
              Select categories to hide from the notes view
              {hiddenCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-(--monarch-bg-hover)">
                  {hiddenCount} hidden
                </span>
              )}
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
            {loading && (
              <div className="text-center py-8 text-monarch-text-muted">Loading categories...</div>
            )}
            {!loading && filteredGroups.length === 0 && (
              <div className="text-center py-8 text-monarch-text-muted">
                {searchQuery ? 'No categories match your search' : 'No categories available'}
              </div>
            )}
            {!loading && filteredGroups.length > 0 && (
              <div className="space-y-2">
                {filteredGroups.map((group) => {
                  const isExpanded = expandedGroups.has(group.id);
                  const isGroupHidden = hiddenGroups.includes(group.id);
                  const hiddenCategoriesInGroup = group.categories.filter((c) =>
                    hiddenCategories.includes(c.id)
                  ).length;

                  return (
                    <div
                      key={group.id}
                      className="rounded-lg overflow-hidden border border-monarch-border"
                    >
                      {/* Group header */}
                      <div
                        className="flex items-center gap-2 px-3 py-2"
                        style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
                      >
                        {/* Expand/collapse button */}
                        {group.categories.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(group.id)}
                            className="p-0.5 rounded hover:bg-(--monarch-bg-card) transition-colors"
                            aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
                          >
                            {isExpanded ? (
                              <ChevronDown
                                size={16}
                                style={{ color: 'var(--monarch-text-muted)' }}
                              />
                            ) : (
                              <ChevronRight
                                size={16}
                                style={{ color: 'var(--monarch-text-muted)' }}
                              />
                            )}
                          </button>
                        )}

                        {/* Group name */}
                        <span
                          className="flex-1 font-medium text-sm"
                          style={{ color: 'var(--monarch-text-dark)' }}
                        >
                          {decodeHtmlEntities(group.name)}
                        </span>

                        {/* Hidden count badge */}
                        {hiddenCategoriesInGroup > 0 && !isGroupHidden && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--monarch-bg-card)',
                              color: 'var(--monarch-text-muted)',
                            }}
                          >
                            {hiddenCategoriesInGroup} hidden
                          </span>
                        )}

                        {/* Hide group button */}
                        <button
                          type="button"
                          onClick={() => onToggleGroup(group.id)}
                          className={`p-1.5 rounded transition-colors ${
                            isGroupHidden
                              ? 'bg-(--monarch-orange) text-white'
                              : 'hover:bg-(--monarch-bg-card)'
                          }`}
                          title={isGroupHidden ? 'Show entire group' : 'Hide entire group'}
                          aria-label={
                            isGroupHidden
                              ? `Show ${decodeHtmlEntities(group.name)} group`
                              : `Hide ${decodeHtmlEntities(group.name)} group`
                          }
                        >
                          {isGroupHidden ? (
                            <Eye size={16} />
                          ) : (
                            <EyeOff size={16} style={{ color: 'var(--monarch-text-muted)' }} />
                          )}
                        </button>
                      </div>

                      {/* Categories */}
                      {isExpanded && group.categories.length > 0 && (
                        <div className="border-t" style={{ borderColor: 'var(--monarch-border)' }}>
                          {group.categories.map((category) => {
                            const isCategoryHidden =
                              hiddenCategories.includes(category.id) || isGroupHidden;

                            return (
                              <div
                                key={category.id}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-(--monarch-bg-hover) transition-colors"
                                style={{
                                  paddingLeft: '2.5rem',
                                  opacity: isGroupHidden ? 0.5 : 1,
                                }}
                              >
                                {category.icon && <span className="text-sm">{category.icon}</span>}
                                <span
                                  className="flex-1 text-sm"
                                  style={{ color: 'var(--monarch-text-dark)' }}
                                >
                                  {decodeHtmlEntities(category.name)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onToggleCategory(category.id)}
                                  disabled={isGroupHidden}
                                  className={`p-1.5 rounded transition-colors ${
                                    isCategoryHidden && !isGroupHidden
                                      ? 'bg-(--monarch-orange) text-white'
                                      : 'hover:bg-(--monarch-bg-card)'
                                  } ${isGroupHidden ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  title={(() => {
                                    if (isGroupHidden) return 'Entire group is hidden';
                                    if (isCategoryHidden) return 'Show category';
                                    return 'Hide category';
                                  })()}
                                  aria-label={
                                    isCategoryHidden
                                      ? `Show ${decodeHtmlEntities(category.name)}`
                                      : `Hide ${decodeHtmlEntities(category.name)}`
                                  }
                                >
                                  {isCategoryHidden && !isGroupHidden ? (
                                    <Eye size={14} />
                                  ) : (
                                    <EyeOff
                                      size={14}
                                      style={{
                                        color: 'var(--monarch-text-muted)',
                                      }}
                                    />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="p-4 border-t border-monarch-border rounded-b-xl"
            style={{ backgroundColor: 'var(--monarch-bg-page)' }}
          >
            <SingleButtonFooter onClick={onClose} variant="warning">
              Done
            </SingleButtonFooter>
          </div>
        </div>
      </div>
    </Portal>
  );
}
