/**
 * useHiddenCategories Hook
 *
 * Manages hidden category groups and categories for the notes feature.
 * Persists to localStorage.
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'eclosion-hidden-categories';

interface HiddenCategoriesState {
  /** Hidden category group IDs */
  groups: string[];
  /** Hidden individual category IDs */
  categories: string[];
}

function loadFromStorage(): HiddenCategoriesState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        groups: Array.isArray(parsed.groups) ? parsed.groups : [],
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      };
    }
  } catch {
    // Ignore parse errors
  }
  return { groups: [], categories: [] };
}

function saveToStorage(state: HiddenCategoriesState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function useHiddenCategories() {
  const [state, setState] = useState<HiddenCategoriesState>(() => loadFromStorage());

  // Sync to localStorage when state changes
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const toggleGroup = useCallback((groupId: string) => {
    setState((prev) => {
      const groups = prev.groups.includes(groupId)
        ? prev.groups.filter((id) => id !== groupId)
        : [...prev.groups, groupId];
      return { ...prev, groups };
    });
  }, []);

  const toggleCategory = useCallback((categoryId: string) => {
    setState((prev) => {
      const categories = prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId];
      return { ...prev, categories };
    });
  }, []);

  const isGroupHidden = useCallback(
    (groupId: string) => state.groups.includes(groupId),
    [state.groups]
  );

  const isCategoryHidden = useCallback(
    (categoryId: string) => state.categories.includes(categoryId),
    [state.categories]
  );

  const setHiddenGroups = useCallback((groups: string[]) => {
    setState((prev) => ({ ...prev, groups }));
  }, []);

  const setHiddenCategories = useCallback((categories: string[]) => {
    setState((prev) => ({ ...prev, categories }));
  }, []);

  const hiddenCount = state.groups.length + state.categories.length;

  return {
    hiddenGroups: state.groups,
    hiddenCategories: state.categories,
    hiddenCount,
    toggleGroup,
    toggleCategory,
    isGroupHidden,
    isCategoryHidden,
    setHiddenGroups,
    setHiddenCategories,
  };
}
