/**
 * Category Group Store Queries
 *
 * Normalized cache for category groups and unmapped categories.
 * Single source of truth for dropdown selections, wizards, and modals.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type { CategoryGroup, UnmappedCategory } from '../../types/category';
import type { CategoryGroupStore } from '../../types/categoryGroupStore';

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalize category groups into store shape
 */
function normalizeGroups(groups: CategoryGroup[]): Pick<CategoryGroupStore, 'groups' | 'groupOrder'> {
  const normalized: Record<string, CategoryGroup> = {};
  const order: string[] = [];

  for (const group of groups) {
    order.push(group.id);
    normalized[group.id] = group;
  }

  return { groups: normalized, groupOrder: order };
}

/**
 * Normalize unmapped categories into store shape
 */
function normalizeUnmappedCategories(
  categories: UnmappedCategory[]
): Pick<CategoryGroupStore, 'unmappedCategories' | 'unmappedCategoryOrder'> {
  const normalized: Record<string, UnmappedCategory> = {};
  const order: string[] = [];

  // Sort by group_order then category_order
  const sorted = [...categories].sort((a, b) => {
    if (a.group_order !== b.group_order) {
      return a.group_order - b.group_order;
    }
    return a.category_order - b.category_order;
  });

  for (const cat of sorted) {
    order.push(cat.id);
    normalized[cat.id] = cat;
  }

  return { unmappedCategories: normalized, unmappedCategoryOrder: order };
}

// ============================================================================
// Main Queries
// ============================================================================

/**
 * Category groups store - fetches and normalizes category groups
 *
 * Use this instead of direct API calls to ensure caching.
 */
export function useCategoryGroupsStore() {
  const isDemo = useDemo();

  return useQuery({
    queryKey: getQueryKey(queryKeys.categoryGroups, isDemo),
    queryFn: async () => {
      const groups = isDemo
        ? await demoApi.getCategoryGroups()
        : await api.getCategoryGroups();
      return normalizeGroups(groups);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Unmapped categories store - fetches and normalizes unmapped categories
 *
 * Use this instead of direct API calls to ensure caching.
 */
export function useUnmappedCategoriesStore() {
  const isDemo = useDemo();

  return useQuery({
    queryKey: getQueryKey(queryKeys.unmappedCategories, isDemo),
    queryFn: async () => {
      const categories = isDemo
        ? await demoApi.getUnmappedCategories()
        : await api.getUnmappedCategories();
      return normalizeUnmappedCategories(categories);
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// ============================================================================
// Selectors (derived data from stores)
// ============================================================================

/**
 * Get category groups as array (for dropdowns)
 */
export function useCategoryGroupsList(): {
  groups: CategoryGroup[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useCategoryGroupsStore();

  const groups = data
    ? data.groupOrder
        .map((id) => data.groups[id])
        .filter((g): g is CategoryGroup => g !== undefined)
    : [];

  return { groups, isLoading, error };
}

/**
 * Get a single category group by ID
 */
export function useCategoryGroup(id: string): CategoryGroup | undefined {
  const { data } = useCategoryGroupsStore();
  return data?.groups[id];
}

/**
 * Get unmapped categories as array (for link modals)
 */
export function useUnmappedCategoriesList(): {
  categories: UnmappedCategory[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useUnmappedCategoriesStore();

  const categories = data
    ? data.unmappedCategoryOrder
        .map((id) => data.unmappedCategories[id])
        .filter((c): c is UnmappedCategory => c !== undefined)
    : [];

  return { categories, isLoading, error };
}

/**
 * Get unmapped categories grouped by their category group
 */
export function useUnmappedCategoriesByGroup(): {
  groups: Array<{
    id: string;
    name: string;
    categories: UnmappedCategory[];
  }>;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useUnmappedCategoriesStore();

  if (!data) {
    return { groups: [], isLoading, error };
  }

  // Group categories by their group_id
  const groupMap = new Map<string, { id: string; name: string; categories: UnmappedCategory[] }>();

  for (const catId of data.unmappedCategoryOrder) {
    const cat = data.unmappedCategories[catId];
    if (!cat) continue;

    if (!groupMap.has(cat.group_id)) {
      groupMap.set(cat.group_id, {
        id: cat.group_id,
        name: cat.group_name,
        categories: [],
      });
    }
    groupMap.get(cat.group_id)!.categories.push(cat);
  }

  // Convert to sorted array
  const groups = Array.from(groupMap.values()).sort((a, b) => {
    const aFirstId = a.categories[0]?.id;
    const bFirstId = b.categories[0]?.id;
    const aOrder = aFirstId ? (data.unmappedCategories[aFirstId]?.group_order ?? 0) : 0;
    const bOrder = bFirstId ? (data.unmappedCategories[bFirstId]?.group_order ?? 0) : 0;
    return aOrder - bOrder;
  });

  return { groups, isLoading, error };
}

/**
 * Get a single unmapped category by ID
 */
export function useUnmappedCategory(id: string): UnmappedCategory | undefined {
  const { data } = useUnmappedCategoriesStore();
  return data?.unmappedCategories[id];
}

// ============================================================================
// Cache Utilities
// ============================================================================

/**
 * Refresh category groups
 */
export function useRefreshCategoryGroups() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: getQueryKey(queryKeys.categoryGroups, isDemo),
    });
  }, [queryClient, isDemo]);
}

/**
 * Refresh unmapped categories
 */
export function useRefreshUnmappedCategories() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: getQueryKey(queryKeys.unmappedCategories, isDemo),
    });
  }, [queryClient, isDemo]);
}

/**
 * Remove a category from the unmapped cache (after linking)
 */
export function useRemoveFromUnmappedCache() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(
    (categoryId: string) => {
      queryClient.setQueryData<ReturnType<typeof normalizeUnmappedCategories>>(
        getQueryKey(queryKeys.unmappedCategories, isDemo),
        (old) => {
          if (!old) return old;
          const { [categoryId]: _removed, ...rest } = old.unmappedCategories;
          return {
            unmappedCategories: rest,
            unmappedCategoryOrder: old.unmappedCategoryOrder.filter((id) => id !== categoryId),
          };
        }
      );
    },
    [queryClient, isDemo]
  );
}
