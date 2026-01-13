# Normalized Category Cache Implementation Plan

## Problem Statement

Currently, category data is fetched and cached separately by different features:
- **Recurring Tab**: Uses `dashboard` query, which includes category metadata
- **Notes Tab**: Uses `notesCategories` query, which fetches category data independently

This leads to sync issues where updating a category name on one screen doesn't reflect on another until a manual re-sync. The fix applied (invalidating `notesCategories` when renaming) is a band-aid that still requires refetching.

## Proposed Solution

Implement a **normalized category cache** with **optimistic updates**:
1. Single source of truth for all category metadata
2. All features derive their category data from this shared cache
3. Mutations update the cache directly (instant UI updates)
4. Sync operations refresh the entire cache

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CATEGORY STORE (normalized)                  │
│  categories: { [id]: { id, name, icon, groupId, groupName } }   │
│  groups: { [id]: { id, name, categoryIds } }                    │
│  groupOrder: string[]                                           │
│                                                                 │
│  Updated by:                                                    │
│  - Sync (full refresh from Monarch)                             │
│  - Mutations (surgical update by ID, optimistic)                │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
     ┌────────────┐    ┌────────────┐    ┌────────────┐
     │ Recurring  │    │   Notes    │    │  Wizards   │
     │   Tab      │    │   Tab      │    │            │
     │            │    │            │    │            │
     │ derives:   │    │ derives:   │    │ derives:   │
     │ + targets  │    │ + notes    │    │ + groups   │
     │ + balances │    │ + history  │    │            │
     └────────────┘    └────────────┘    └────────────┘
```

## Data Structures

### Core Types

```typescript
// frontend/src/types/categoryStore.ts

export interface CategoryMetadata {
  id: string;
  name: string;
  icon: string;
  groupId: string;
  groupName: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
  categoryIds: string[];  // references to category IDs
}

export interface CategoryStore {
  categories: Record<string, CategoryMetadata>;  // normalized by ID
  groups: Record<string, CategoryGroup>;         // normalized by ID
  groupOrder: string[];                          // preserve group ordering
}
```

### Query Key

```typescript
// frontend/src/api/queries/keys.ts
export const queryKeys = {
  // ... existing keys
  categoryStore: ['categoryStore'] as const,
};
```

## Implementation Phases

### Phase 1: Foundation (New Files)

**Files to create:**
- `frontend/src/types/categoryStore.ts` - Type definitions
- `frontend/src/api/queries/categoryStoreQueries.ts` - Query and cache utilities

**categoryStoreQueries.ts structure:**

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type { CategoryStore, CategoryMetadata } from '../../types/categoryStore';

// Normalize raw API response into store shape
function normalizeCategories(raw: RawCategoryResponse): CategoryStore {
  const categories: Record<string, CategoryMetadata> = {};
  const groups: Record<string, CategoryGroup> = {};
  const groupOrder: string[] = [];

  for (const group of raw.groups) {
    groupOrder.push(group.id);
    groups[group.id] = {
      id: group.id,
      name: group.name,
      categoryIds: group.categories.map(c => c.id),
    };

    for (const cat of group.categories) {
      categories[cat.id] = {
        id: cat.id,
        name: cat.name,
        icon: cat.icon || '',
        groupId: group.id,
        groupName: group.name,
      };
    }
  }

  return { categories, groups, groupOrder };
}

// Main query - fetches and normalizes all categories
export function useCategoryStore() {
  const isDemo = useDemo();

  return useQuery({
    queryKey: getQueryKey(queryKeys.categoryStore, isDemo),
    queryFn: async () => {
      const raw = isDemo
        ? await demoApi.getNotesCategories()
        : await api.getNotesCategories();
      return normalizeCategories({ groups: raw });
    },
    staleTime: 5 * 60 * 1000,  // 5 minutes
  });
}
```

### Phase 2: Selectors

Add to `categoryStoreQueries.ts`:

```typescript
// Get a single category by ID
export function useCategory(id: string): CategoryMetadata | undefined {
  const { data } = useCategoryStore();
  return data?.categories[id];
}

// Get just the name (common use case)
export function useCategoryName(id: string): string | undefined {
  return useCategory(id)?.name;
}

// Get categories organized by group (for Notes, Wizards)
export function useCategoriesByGroup() {
  const { data } = useCategoryStore();

  if (!data) return [];

  return data.groupOrder.map(groupId => {
    const group = data.groups[groupId];
    return {
      id: group.id,
      name: group.name,
      categories: group.categoryIds
        .map(catId => data.categories[catId])
        .filter(Boolean),
    };
  });
}

// Get all categories as flat array
export function useAllCategories(): CategoryMetadata[] {
  const { data } = useCategoryStore();
  return data ? Object.values(data.categories) : [];
}
```

### Phase 3: Cache Mutation Utilities

Add to `categoryStoreQueries.ts`:

```typescript
// Update a single category in cache (for optimistic updates)
export function useUpdateCategoryInCache() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback((
    categoryId: string,
    updates: Partial<CategoryMetadata>
  ) => {
    queryClient.setQueryData<CategoryStore>(
      getQueryKey(queryKeys.categoryStore, isDemo),
      (old) => {
        if (!old || !old.categories[categoryId]) return old;
        return {
          ...old,
          categories: {
            ...old.categories,
            [categoryId]: { ...old.categories[categoryId], ...updates }
          }
        };
      }
    );
  }, [queryClient, isDemo]);
}

// Get current value from cache (for rollback)
export function useGetCategoryFromCache() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback((categoryId: string): CategoryMetadata | undefined => {
    const store = queryClient.getQueryData<CategoryStore>(
      getQueryKey(queryKeys.categoryStore, isDemo)
    );
    return store?.categories[categoryId];
  }, [queryClient, isDemo]);
}

// Full refresh - called by sync
export function useRefreshCategoryStore() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: getQueryKey(queryKeys.categoryStore, isDemo)
    });
  }, [queryClient, isDemo]);
}
```

### Phase 4: Migrate Notes Tab

**Files to modify:**
- `frontend/src/components/tabs/NotesTab.tsx` (or wherever category tree is rendered)
- Any file using `useNotesCategoriesQuery()`

**Change pattern:**

```typescript
// Before
import { useNotesCategoriesQuery } from '../../api/queries/notesQueries';
const { data: categories } = useNotesCategoriesQuery();

// After
import { useCategoriesByGroup } from '../../api/queries/categoryStoreQueries';
const categories = useCategoriesByGroup();
```

### Phase 5: Migrate Recurring Tab

The Recurring tab's `dashboard` query contains more than just category metadata (targets, balances, status, etc.). We have two options:

**Option A: Keep dashboard, reference store for names**
```typescript
// RecurringCard.tsx
const categoryName = useCategoryName(item.category_id);
// Falls back to item.category_name if store not loaded yet
const displayName = categoryName ?? item.category_name;
```

**Option B: Dashboard fetches recurring-specific data, store provides category metadata**
- Dashboard returns: `{ items: [{ id, target, balance, status, categoryId }] }`
- Store provides: category names, icons, groups
- Components join them

Option A is simpler and lower risk. Option B is cleaner long-term.

### Phase 6: Optimistic Updates in Mutations

**Modify `useRecurringItemActions.ts`:**

```typescript
import {
  useUpdateCategoryInCache,
  useGetCategoryFromCache
} from '../api/queries/categoryStoreQueries';

const handleNameChangeItem = useCallback(async (id: string, name: string) => {
  const updateCache = useUpdateCategoryInCache();
  const getFromCache = useGetCategoryFromCache();

  // Save current value for rollback
  const previous = getFromCache(id);

  // Optimistically update cache (instant UI update)
  updateCache(id, { name });

  try {
    await client.updateCategoryName(id, name);
    onRefresh();  // Still refresh dashboard for recurring-specific data
    toast.success('Name updated');
  } catch (err) {
    // Rollback on failure
    if (previous) {
      updateCache(id, { name: previous.name });
    }
    toast.error(handleApiError(err, 'Failed to update name'));
  }
}, [client, onRefresh, toast]);
```

**Modify other mutations that affect categories:**
- `useUpdateCategoryEmojiMutation` - update icon in cache
- `useLinkToCategoryMutation` - may need cache update
- Any mutation that creates/deletes categories

### Phase 7: Sync Integration

**Modify sync handler (likely in `useSyncActions.ts` or similar):**

```typescript
import { useRefreshCategoryStore } from '../api/queries/categoryStoreQueries';

const refreshCategoryStore = useRefreshCategoryStore();

const handleSync = async () => {
  await client.sync();

  // Refresh all caches that depend on Monarch data
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    refreshCategoryStore(),
  ]);
};
```

### Phase 8: Cleanup

**Remove deprecated code:**
- `useNotesCategoriesQuery()` from `notesQueries.ts` (after all usages migrated)
- `notesCategories` from `queryKeys` (after migration complete)
- Remove the band-aid invalidation added in the current fix

## Files Changed Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1-3 | `types/categoryStore.ts`, `api/queries/categoryStoreQueries.ts` | `api/queries/keys.ts` |
| 4 | - | Notes components using `useNotesCategoriesQuery` |
| 5 | - | Recurring components (minimal if using Option A) |
| 6 | - | `hooks/useRecurringItemActions.ts`, `api/queries/categoryMutations.ts` |
| 7 | - | Sync-related hooks/components |
| 8 | - | `api/queries/notesQueries.ts`, `api/queries/keys.ts` |

## Demo Mode Compatibility

The implementation must work in demo mode:
- `useCategoryStore` already branches on `isDemo`
- Demo's `getNotesCategories()` returns the same shape
- Optimistic updates work the same way (just updating React Query cache)
- No demo-specific changes needed beyond the query function branch

## Testing Strategy

1. **Unit tests for normalization**: Verify `normalizeCategories` handles edge cases
2. **Unit tests for selectors**: Verify `useCategoriesByGroup`, `useCategory` return correct data
3. **Integration tests**:
   - Rename category on Recurring, verify Notes updates immediately
   - Sync, verify both tabs show fresh data
   - Rename fails, verify rollback works
4. **E2E tests**: Full flow in demo mode

## Rollback Plan

If issues arise:
1. The old `notesCategories` query can be kept temporarily
2. Components can fall back to direct query if store not loaded
3. Optimistic updates can be disabled (just use invalidation)

## Estimated Effort

| Phase | Time |
|-------|------|
| 1-3 (Foundation) | 2-3 hours |
| 4 (Notes migration) | 1-2 hours |
| 5 (Recurring migration) | 1-2 hours |
| 6 (Optimistic updates) | 2-3 hours |
| 7 (Sync integration) | 1 hour |
| 8 (Cleanup) | 30 min |
| Testing | 2-3 hours |
| **Total** | **10-14 hours (~1.5-2 days)** |

## Success Criteria

- [ ] Renaming a category on Recurring instantly reflects on Notes (no loading)
- [ ] Renaming a category on Notes instantly reflects on Recurring (if applicable)
- [ ] Sync refreshes all category data across all features
- [ ] Failed mutations roll back UI to previous state
- [ ] Demo mode works identically
- [ ] No regression in existing functionality
- [ ] All existing tests pass
- [ ] New tests cover the cache utilities
