/**
 * useExportSelection
 *
 * Manages selection state for the export notes modal.
 * Handles group/category selection, expansion state, and bulk actions.
 */

import { useState, useCallback } from 'react';
import type { CategoryGroupWithNotes } from '../types/notes';

interface UseExportSelectionOptions {
  groups: CategoryGroupWithNotes[];
}

interface UseExportSelectionReturn {
  /** Whether to include general month notes */
  includeMonthNotes: boolean;
  /** Set whether to include general month notes */
  setIncludeMonthNotes: (value: boolean) => void;
  /** Set of selected group IDs */
  selectedGroups: Set<string>;
  /** Set of selected category IDs */
  selectedCategories: Set<string>;
  /** Set of expanded group IDs */
  expandedGroups: Set<string>;
  /** Toggle a group's expanded state */
  handleToggleGroupExpand: (groupId: string) => void;
  /** Toggle a group's selection (also toggles its categories) */
  handleToggleGroup: (groupId: string, checked: boolean) => void;
  /** Toggle a category's selection */
  handleToggleCategory: (categoryId: string, checked: boolean) => void;
  /** Select all groups and categories */
  handleSelectAll: () => void;
  /** Deselect all groups and categories */
  handleDeselectAll: () => void;
  /** Whether any content is selected for export */
  hasSelection: boolean;
}

export function useExportSelection({
  groups,
}: UseExportSelectionOptions): UseExportSelectionReturn {
  const [includeMonthNotes, setIncludeMonthNotes] = useState(true);

  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(() => {
    const groupsWithNotes = groups.filter(
      (g) => g.effectiveNote.note || g.categories.some((c) => c.effectiveNote.note)
    );
    return new Set(groupsWithNotes.map((g) => g.id));
  });

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => {
    const categoriesWithNotes = groups.flatMap((g) =>
      g.categories.filter((c) => c.effectiveNote.note).map((c) => c.id)
    );
    return new Set(categoriesWithNotes);
  });

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handleToggleGroupExpand = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const handleToggleGroup = useCallback(
    (groupId: string, checked: boolean) => {
      setSelectedGroups((prev) => {
        const next = new Set(prev);
        if (checked) next.add(groupId);
        else next.delete(groupId);
        return next;
      });

      const group = groups.find((g) => g.id === groupId);
      if (group) {
        setSelectedCategories((prev) => {
          const next = new Set(prev);
          for (const cat of group.categories) {
            if (checked) next.add(cat.id);
            else next.delete(cat.id);
          }
          return next;
        });
      }
    },
    [groups]
  );

  const handleToggleCategory = useCallback((categoryId: string, checked: boolean) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (checked) next.add(categoryId);
      else next.delete(categoryId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedGroups(new Set(groups.map((g) => g.id)));
    setSelectedCategories(new Set(groups.flatMap((g) => g.categories.map((c) => c.id))));
  }, [groups]);

  const handleDeselectAll = useCallback(() => {
    setSelectedGroups(new Set());
    setSelectedCategories(new Set());
  }, []);

  const hasSelection =
    includeMonthNotes || selectedGroups.size > 0 || selectedCategories.size > 0;

  return {
    includeMonthNotes,
    setIncludeMonthNotes,
    selectedGroups,
    selectedCategories,
    expandedGroups,
    handleToggleGroupExpand,
    handleToggleGroup,
    handleToggleCategory,
    handleSelectAll,
    handleDeselectAll,
    hasSelection,
  };
}
