/**
 * Category Store Queries
 *
 * Normalized category cache with optimistic updates.
 * Single source of truth for all category metadata across features.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type {
  CategoryStore,
  CategoryMetadata,
  CategoryGroupMetadata,
  RawCategoryGroup,
} from '../../types/categoryStore';

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalize raw API response into store shape
 */
function normalizeCategories(rawGroups: RawCategoryGroup[]): CategoryStore {
  const categories: Record<string, CategoryMetadata> = {};
  const groups: Record<string, CategoryGroupMetadata> = {};
  const groupOrder: string[] = [];

  for (const group of rawGroups) {
    groupOrder.push(group.id);
    groups[group.id] = {
      id: group.id,
      name: group.name,
      categoryIds: group.categories.map((c) => c.id),
    };

    for (const cat of group.categories) {
      categories[cat.id] = {
        id: cat.id,
        name: cat.name,
        icon: cat.icon ?? '',
        groupId: group.id,
        groupName: group.name,
      };
    }
  }

  return { categories, groups, groupOrder };
}

// ============================================================================
// Main Query
// ============================================================================

/**
 * Main query - fetches and normalizes all categories
 *
 * This is the single source of truth for category metadata.
 * All features should derive their category data from this store.
 */
export function useCategoryStore() {
  const isDemo = useDemo();

  return useQuery({
    queryKey: getQueryKey(queryKeys.categoryStore, isDemo),
    queryFn: async () => {
      const raw = isDemo
        ? await demoApi.getNotesCategories()
        : await api.getNotesCategories();
      return normalizeCategories(raw);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// Selectors (derived data from store)
// ============================================================================

/**
 * Get a single category by ID
 */
export function useCategory(id: string): CategoryMetadata | undefined {
  const { data } = useCategoryStore();
  return data?.categories[id];
}

/**
 * Get just the category name (common use case)
 */
export function useCategoryName(id: string): string | undefined {
  return useCategory(id)?.name;
}

/**
 * Get a single group by ID
 */
export function useGroup(id: string): CategoryGroupMetadata | undefined {
  const { data } = useCategoryStore();
  return data?.groups[id];
}

/**
 * Get categories organized by group (for Notes, Wizards, HiddenCategoriesModal)
 *
 * Returns data in the same shape as the old useNotesCategoriesQuery for easy migration.
 */
export function useCategoriesByGroup() {
  const { data, isLoading, error } = useCategoryStore();

  const categoriesByGroup = data
    ? data.groupOrder
        .map((groupId) => data.groups[groupId])
        .filter((group): group is CategoryGroupMetadata => group !== undefined)
        .map((group) => ({
          id: group.id,
          name: group.name,
          categories: group.categoryIds
            .map((catId) => data.categories[catId])
            .filter((cat): cat is CategoryMetadata => cat !== undefined)
            .map((cat) => ({
              id: cat.id,
              name: cat.name,
              // Return undefined for empty icon to match NotesCategory type
              ...(cat.icon ? { icon: cat.icon } : {}),
            })),
        }))
    : [];

  return { data: categoriesByGroup, isLoading, error };
}

/**
 * Get all categories as flat array
 */
export function useAllCategories(): CategoryMetadata[] {
  const { data } = useCategoryStore();
  return data ? Object.values(data.categories) : [];
}

// ============================================================================
// Cache Mutation Utilities (for optimistic updates)
// ============================================================================

/**
 * Update a single category in cache (for optimistic updates)
 */
export function useUpdateCategoryInCache() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(
    (categoryId: string, updates: Partial<CategoryMetadata>) => {
      queryClient.setQueryData<CategoryStore>(
        getQueryKey(queryKeys.categoryStore, isDemo),
        (old) => {
          if (!old || !old.categories[categoryId]) return old;
          return {
            ...old,
            categories: {
              ...old.categories,
              [categoryId]: { ...old.categories[categoryId], ...updates },
            },
          };
        }
      );
    },
    [queryClient, isDemo]
  );
}

/**
 * Update a group in cache
 */
export function useUpdateGroupInCache() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(
    (groupId: string, updates: Partial<CategoryGroupMetadata>) => {
      queryClient.setQueryData<CategoryStore>(
        getQueryKey(queryKeys.categoryStore, isDemo),
        (old) => {
          if (!old || !old.groups[groupId]) return old;
          return {
            ...old,
            groups: {
              ...old.groups,
              [groupId]: { ...old.groups[groupId], ...updates },
            },
          };
        }
      );
    },
    [queryClient, isDemo]
  );
}

/**
 * Get current value from cache (for rollback on failed mutations)
 */
export function useGetCategoryFromCache() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(
    (categoryId: string): CategoryMetadata | undefined => {
      const store = queryClient.getQueryData<CategoryStore>(
        getQueryKey(queryKeys.categoryStore, isDemo)
      );
      return store?.categories[categoryId];
    },
    [queryClient, isDemo]
  );
}

/**
 * Get current group from cache (for rollback)
 */
export function useGetGroupFromCache() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(
    (groupId: string): CategoryGroupMetadata | undefined => {
      const store = queryClient.getQueryData<CategoryStore>(
        getQueryKey(queryKeys.categoryStore, isDemo)
      );
      return store?.groups[groupId];
    },
    [queryClient, isDemo]
  );
}

/**
 * Full refresh - called by sync
 */
export function useRefreshCategoryStore() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: getQueryKey(queryKeys.categoryStore, isDemo),
    });
  }, [queryClient, isDemo]);
}

/**
 * Invalidate category store (alias for refresh)
 */
export function useInvalidateCategoryStore() {
  return useRefreshCategoryStore();
}
