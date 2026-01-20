# Normalized Data Stores

**Use normalized stores for shared data accessed by multiple features.**

This pattern ensures consistent caching, prevents stale data, and enables efficient updates. All shared data should flow through React Query stores, never through direct API calls.

## When to Use

Create a normalized store when:
- Multiple components need the same data
- Data needs to be updated optimistically
- You need derived views of the same underlying data
- Direct API calls are bypassing React Query's cache

## Architecture

```
Store Layer (single source of truth)
  → Fetches and normalizes data from API
  → Maintains entity maps: Record<id, Entity>
  → Maintains order arrays for sorted access
      │
      ▼
Selector Layer (derived views)
  → useCategoryGroupsList() → CategoryGroup[]
  → useCategoryGroup(id) → CategoryGroup | undefined
      │
      ▼
Components (consume selectors)
  → Never call API directly for shared data
  → Use cache utilities for optimistic updates
```

## Creating a New Store

1. **Create type definitions** (`types/myDataStore.ts`):

```typescript
export interface MyEntityStore {
  entities: Record<string, MyEntity>;
  entityOrder: string[];
}
```

2. **Create store queries** (`api/queries/myDataStoreQueries.ts`):

```typescript
export function useMyDataStore() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.myData, isDemo),
    queryFn: async () => {
      const raw = isDemo ? await demoApi.getMyData() : await api.getMyData();
      return normalizeMyData(raw);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Selectors
export function useMyDataList(): MyEntity[] {
  const { data } = useMyDataStore();
  return data?.entityOrder.map(id => data.entities[id]).filter(Boolean) ?? [];
}

// Cache utilities
export function useUpdateMyEntityInCache() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();
  return useCallback((id: string, updates: Partial<MyEntity>) => {
    queryClient.setQueryData<MyEntityStore>(
      getQueryKey(queryKeys.myData, isDemo),
      (old) => old ? { ...old, entities: { ...old.entities, [id]: { ...old.entities[id], ...updates } } } : old
    );
  }, [queryClient, isDemo]);
}
```

## Existing Stores

| Store | Purpose | Key Selectors |
|-------|---------|---------------|
| `categoryStoreQueries.ts` | Category metadata | `useCategoriesByGroup()`, `useCategory()` |
| `categoryGroupStoreQueries.ts` | Category groups | `useCategoryGroupsList()`, `useUnmappedCategoriesList()` |
| `configStoreQueries.ts` | App configuration | `useConfig()`, `useIsConfigured()` |

## Anti-Patterns

```typescript
// BAD - Direct API call bypasses cache
const [groups, setGroups] = useState([]);
useEffect(() => { client.getCategoryGroups().then(setGroups); }, []);

// GOOD - Use the store
const { groups, isLoading } = useCategoryGroupsList();
```
