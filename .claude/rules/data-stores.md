# Normalized Data Stores

Use normalized React Query stores for shared data accessed by multiple features. Never call API directly for shared data.

## Architecture

Store (fetches/normalizes, `Record<id, Entity>` + order arrays) → Selectors (derived views like `useMyDataList()`) → Components (consume selectors, use cache utils for optimistic updates).

## Creating a Store

1. Type: `types/myDataStore.ts` — `{ entities: Record<string, T>, entityOrder: string[] }`
2. Query: `api/queries/myDataStoreQueries.ts` — `useMyDataStore()` with `useDemo()` routing, selectors, and `useUpdateMyEntityInCache()` for optimistic updates
3. Export from `api/queries/index.ts`

## Existing Stores

| Store | Key Selectors |
|-------|---------------|
| `categoryStoreQueries.ts` | `useCategoriesByGroup()`, `useCategory()`, `useCategoryName()` |
| `categoryGroupStoreQueries.ts` | `useCategoryGroupsList()`, `useUnmappedCategoriesList()` |
| `configStoreQueries.ts` | `useConfig()`, `useIsConfigured()`, `useAutoSyncSettings()` |

## Rules

- Never `useState`+`useEffect` to fetch shared data — use store selectors
- Invalidate relevant store query keys after mutations
