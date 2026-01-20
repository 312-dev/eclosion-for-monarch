# Demo Mode Compatibility

**All features must work in demo mode.**

Demo mode uses localStorage instead of the backend API. The demo is hosted on Cloudflare Pages and runs entirely in the browser.

## How Demo Mode Works

- **URL-based**: paths starting with `/demo/` trigger demo mode
- **Build-time**: `VITE_DEMO_MODE=true` env var enables global demo mode
- `useDemo()` hook returns `true` in demo mode
- `api/queries.ts` routes to `demoClient.ts` or `client.ts` based on mode
- Data persists in localStorage under `eclosion-demo-data`

## When Adding New Features

1. **If the feature calls API endpoints**, add equivalent functions to `api/demoClient.ts`
2. **If new data structures are needed**, update `api/demoData.ts` with seed data
3. **Mutations must update localStorage** and trigger React Query invalidation
4. **Test the feature** at `/demo/recurring` and `/demo/settings`

## Demo Client Pattern

```typescript
// In api/demoClient.ts
export async function newFeatureAction(params: Params): Promise<Result> {
  const state = loadDemoState();
  state.dashboard.someValue = params.newValue;
  saveDemoState(state);
  return { success: true };
}

// In api/queries.ts
export function useNewFeatureMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: isDemo ? demoApi.newFeatureAction : api.newFeatureAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}
```

## Calculation Parity

**Demo mode must use the same calculation logic as the main app.**

Do not reimplement calculation logic in demo files. Import and use shared functions:

| Calculation | Shared Function | Location |
|-------------|-----------------|----------|
| Item status | `calculateItemDisplayStatus()` | `hooks/useItemDisplayStatus.ts` |
| Rollup status | `calculateDisplayStatus()` | `utils/status.ts` |
| Monthly target | `calculateMonthlyTarget()` | `utils/calculations.ts` |

```typescript
// BAD - Reimplementing status logic in demo
const newStatus = totalSaved >= item.amount ? 'funded' : progress >= 80 ? 'on_track' : 'behind';

// GOOD - Import and use shared function
import { calculateItemDisplayStatus } from '../../hooks/useItemDisplayStatus';
const newStatus = calculateItemDisplayStatus(updatedItem);
```

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/context/DemoContext.tsx` | Provides `useDemo()` hook |
| `frontend/src/api/demoClient.ts` | Re-exports from `api/demo/` modules |
| `frontend/src/api/demo/` | Modular demo implementations |
| `frontend/src/api/demoData.ts` | Initial seed data |
| `frontend/src/api/queries.ts` | Routes queries/mutations by mode |
