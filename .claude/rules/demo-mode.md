# Demo Mode

All features must work in demo mode (localStorage, no backend).

## How It Works

`useDemo()` returns true for `/demo/*` paths or `VITE_DEMO_MODE=true`. `api/queries.ts` routes to `demoClient.ts` or `client.ts`. Data in localStorage under `eclosion-demo-data`.

## Adding Features

1. Add equivalent functions in `api/demo/*.ts` (re-exported via `api/demoClient.ts`)
2. Update `api/demoData.ts` with seed data if needed
3. Mutations must update localStorage + trigger React Query invalidation
4. Test at `/demo/recurring` and `/demo/settings`

## Calculation Parity

Import shared functions — never reimplement logic in demo files:
- `calculateItemDisplayStatus()` from `hooks/useItemDisplayStatus.ts`
- `calculateDisplayStatus()` from `utils/status.ts`
- `calculateMonthlyTarget()` from `utils/calculations.ts`
