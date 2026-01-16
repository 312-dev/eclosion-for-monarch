# CLAUDE.md - Project Guidelines

This file contains coding standards and guidelines for AI assistants working on this codebase.

## Project Overview

Eclosion for Monarch is an open source desktop & web app that expands what's possible with Monarch Money. It features a React/TypeScript frontend and Python/Flask backend with recurring expense tracking, monthly category notes, and direct Monarch sync. The demo mode runs entirely in the browser with localStorage.

## Code Standards

All new code must follow these standards. Existing code is being progressively updated to meet these standards, so you may encounter legacy patterns that don't follow these rules. When modifying existing files, update the code you touch to follow these standards.

### Hover States

**Use CSS/Tailwind for hover effects, not JavaScript handlers.**

```tsx
// BAD - Do not use inline JS hover handlers
onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color)'}
onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}

// GOOD - Use Tailwind hover variants
className="bg-transparent hover:bg-[var(--monarch-bg-page)]"
```

Exception: Complex conditional or stateful hover logic may use JS when CSS cannot achieve the effect.

### Component Size

**Components must not exceed 300 lines.**

- Split large components into focused, single-responsibility modules
- Extract reusable sub-components (headers, list items, action bars)
- Keep business logic in custom hooks when appropriate

### Accessibility

**All interactive elements must be accessible.**

Required attributes:
- `aria-label` on icon-only buttons
- `aria-expanded` on dropdown triggers
- `aria-haspopup` on menu buttons
- `role` attributes when semantic HTML isn't used

Keyboard navigation:
- Clickable `<div>` elements must have `onKeyDown` handlers
- Dropdowns must support arrow key navigation
- Modals must trap focus and close on Escape
- All interactive elements must be Tab-accessible

Semantic HTML:
- Use `<button>` for clickable elements, not `<div>`
- Use `<nav>`, `<main>`, `<aside>` appropriately
- Maintain proper heading hierarchy (h1 > h2 > h3)

### Testing

**New components and utilities must have tests.**

- Use Vitest + React Testing Library
- Utility functions require 80%+ coverage
- All custom hooks must have tests
- Critical user flows need integration tests

## Testing Strategy

This project uses a multi-layer testing approach to ensure reliability:

### Test Pyramid

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: Integration Tests (tests/integration/)                 │
│ Tests: Real Monarch API + our service code                      │
│ When: Before releases only (gates beta/stable)                  │
│ Coverage: CategoryManager, SyncService with real API            │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: E2E Tests (desktop/e2e/)                               │
│ Tests: Full UI flows in demo mode                               │
│ When: Every PR/push                                             │
│ Coverage: Critical user journeys, accessibility                 │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: Unit Tests (tests/, frontend/src/**/*.test.*)          │
│ Tests: Business logic with mocked dependencies                  │
│ When: Every PR/push                                             │
│ Coverage: Services, hooks, utilities, components                │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: Static Analysis                                        │
│ Tests: Types, linting, formatting                               │
│ When: Every PR/push                                             │
│ Coverage: All code                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Structure?

| Layer | What It Proves | Limitations |
|-------|----------------|-------------|
| **Unit tests** | Business logic is correct with expected inputs | Mocks might not match real API |
| **E2E tests** | UI flows work end-to-end | Only tests demo mode, not real Monarch |
| **Integration tests** | Our code + real Monarch API work together | Only runs before releases |

The combination provides confidence that:
1. Our logic is correct (unit tests)
2. Users can complete tasks (E2E tests)
3. Real-world Monarch API integration works (integration tests)

### Integration Tests Deep Dive

Integration tests live in `tests/integration/` and test against the **real Monarch API**:

**Test Types:**

| File | What It Tests |
|------|---------------|
| `test_api_coverage.py` | All Monarch API functions return expected structures |
| `test_services.py` | Our service classes (CategoryManager, etc.) work with real API |
| `test_category_lifecycle.py` | Category CRUD operations |
| `test_budget_operations.py` | Budget amount setting |
| `test_sync_readonly.py` | Read-only sync operations |
| `test_authentication.py` | Login and MFA handling |

**Non-Destructive Pattern:**

All write tests follow create → test → cleanup:

```python
@pytest.mark.integration
@pytest.mark.asyncio
async def test_example(monarch_client, unique_test_name):
    """Test with automatic cleanup."""
    cat_id = None
    try:
        # Create temporary test data
        cat_id = await monarch_client.create_transaction_category(
            name=unique_test_name,  # "ECLOSION-TEST-20260112-123456"
            group_id=group_id,
        )

        # Test our code
        assert cat_id is not None

    finally:
        # Always cleanup
        if cat_id:
            await monarch_client.delete_transaction_category(cat_id)
```

**Adding New Monarch API Calls:**

When you add new Monarch API usage to the app, you MUST add integration tests:

1. Add the API call to your service code
2. Add tests in `tests/integration/` that exercise the call
3. The CI check `Check Monarch API integration test coverage` will fail if coverage is missing

The coverage checker (`scripts/check-monarch-api-coverage.py`) automatically detects all `mm.method()` calls in services and ensures each has a corresponding test.

**Safety Tests:**

Integration tests include explicit safety verification:

```python
async def test_delete_only_deletes_specified_category():
    """SAFETY: Verify delete doesn't affect other categories."""
    # Count categories before
    # Create test category
    # Delete test category
    # Verify count is back to original (nothing else deleted)
```

These tests ensure our code doesn't accidentally perform destructive operations on user data.

### Icons

**Use the centralized icon system, not inline SVGs.**

```tsx
// BAD - Inline SVG
<svg viewBox="0 0 24 24">...</svg>

// GOOD - Icon component
import { Icons } from '../icons';
<Icons.Settings className="h-5 w-5" />
```

### Styling

**Prefer Tailwind classes over inline styles.**

```tsx
// BAD - Inline styles for static values
style={{ display: 'flex', gap: '8px', padding: '16px' }}

// GOOD - Tailwind classes
className="flex gap-2 p-4"

// OK - CSS variables for dynamic theming
style={{ color: 'var(--monarch-text-dark)' }}
```

### Z-Index

**Use the established z-index scale.**

```typescript
// Z-Index Hierarchy (from constants/index.ts)
DROPDOWN: 10       // Dropdown menus, select menus
STICKY: 20         // Sticky headers, navigation
POPOVER: 30        // Popovers, config panels
MODAL_BACKDROP: 40 // Semi-transparent backdrop
MODAL: 50          // Modal/dialog content
TOAST: 60          // Toast notifications
TOOLTIP: 70        // Tooltips (highest layer)
```

Import from constants: `import { Z_INDEX } from '../constants';`

### Animations

**Use the centralized animation framework.**

The animation system is defined in `index.css` with CSS variables matching `constants/index.ts`. All animations respect `prefers-reduced-motion` for accessibility.

**Timing Variables (CSS):**
```css
--animation-fast: 150ms   /* Micro-interactions */
--animation-normal: 200ms /* Standard transitions */
--animation-slow: 300ms   /* Emphasis animations */
```

> **Note:** The TypeScript constants in `constants/index.ts` use different values (150/300/500ms) for programmatic delays like `setTimeout`. The CSS variables above are what actually render animations.

**Page Transitions:**
```tsx
// Tab/page content wrappers
<div className="tab-content-enter">

// Cards/sections within pages (auto-staggers)
<div className="section-enter">
```

**Micro-Interactions:**
```tsx
// Buttons - subtle press feedback
<button className="btn-press">

// Icon buttons - scale on hover/press
<button className="icon-btn-hover">

// Toggle switches
<button className="toggle-switch">
  <span className="toggle-knob" />
</button>
```

**List Animations:**
```tsx
// List items with stagger (up to 15 items)
<tr className="list-item-enter">

// Item highlight after action
<tr className="list-item-highlight">
```

**Feedback States:**
```tsx
// Error shake
<div className="animate-error-shake">

// Success pulse
<div className="animate-success">

// Loading pulse
<div className="animate-loading">
```

**Utility Classes:**
- `fade-in`, `fade-out` - Basic fades
- `slide-up`, `slide-down` - Slide animations
- `scale-in`, `pop-in` - Scale (pop-in has bounce)
- `transition-fast`, `transition-normal`, `transition-slow` - Duration utilities
- `transition-colors-fast`, `transition-transform-fast` - Property-specific

### Currency Rounding

**Monarch Money doesn't support cents, so we round to whole dollars.**

Rounding rules:

| Context | Method | Reason |
|---------|--------|--------|
| Monthly targets | `round_monthly_rate()` | Minimizes overbudgeting, min $1 for non-zero |
| Balance comparisons | `Math.round()` | Standard rounding for display |
| Currency display | `maximumFractionDigits: 0` | No cents shown |

The `round_monthly_rate()` helper uses standard rounding with a minimum of $1:
- Prevents $0 display for small expenses (e.g., $5/year → $1/mo, not $0/mo)
- Self-corrects via monthly recalculation if slightly behind
- Reduces overbudgeting by ~27% compared to ceil() on small amounts

```typescript
// Backend (Python) - services/frozen_target_calculator.py
def round_monthly_rate(rate: float) -> int:
    if rate <= 0:
        return 0
    return max(1, int(rate + 0.5))  # round-half-up, min $1

// Frontend (TypeScript) - utils/calculations.ts
export function roundMonthlyRate(rate: number): number {
  if (rate <= 0) return 0;
  return Math.max(1, Math.round(rate));
}
```

Example: A $100 yearly expense calculates to $8.33/month → rounds to $8/month ($96 total). If slightly behind, next month's target auto-adjusts upward.

### Status Badge Calculation

**Status badges indicate whether users are on track with their savings.**

The status is determined by comparing the user's **budget** (what they're allocating monthly) against the **effective target** (what they need to allocate).

**Key concepts:**

- **Funded** = You have enough saved for the upcoming bill (`balance >= amount`)
- **On Track** = You're budgeting enough this month (`budget >= target`)

These are independent - "Funded" takes priority over budget comparisons.

**Status Logic (in `useItemDisplayStatus.ts`):**

```typescript
// Priority 1: If you have enough saved, you're funded
if (balance >= amount) return 'funded';

// Priority 2: Compare budget vs target
if (budget > target) return 'ahead';
if (budget >= target) return 'on_track';
return 'behind';
```

**Examples:**

| Expense | Balance | Amount | Budget | Target | Status | Why |
|---------|---------|--------|--------|--------|--------|-----|
| $600/yr | $600 | $600 | $0 | $0 | Funded | Have enough for the bill |
| $600/yr | $600 | $600 | $50 | $0 | Funded | Have enough (budget irrelevant) |
| $600/yr | $300 | $600 | $75 | $50 | Ahead | Budgeting more than target |
| $600/yr | $300 | $600 | $50 | $50 | On Track | Meeting monthly goal |
| $600/yr | $300 | $600 | $30 | $50 | Behind | Under monthly goal |
| $175/qtr | $175 | $175 | $175 | $175 | Funded | Have enough for the bill |
| $78/wk | $340 | $312 | $340 | $312 | Funded | Have enough for monthly equiv |

See `frontend/src/hooks/useItemDisplayStatus.ts` for full implementation with detailed comments.

### Error Handling

**Use standardized error utilities.**

```typescript
import { getErrorMessage, handleApiError } from '../utils/errors';

// In catch blocks
catch (error) {
  const message = handleApiError(error, 'Failed to load data');
  setError(message);
}
```

### Rate Limit Handling

**Components with Monarch API mutations must respect rate limits.**

When Monarch rate limits the app (429 responses), the app enters a degraded state:
- A global banner warns the user
- Features requiring live Monarch API are disabled
- The app polls every 5 minutes to detect when the rate limit clears

**Required pattern for API-mutating components:**

```tsx
import { useIsRateLimited } from '../../context/RateLimitContext';

function MyComponent({ onSave, isSaving }) {
  const isRateLimited = useIsRateLimited();

  // Combine with other loading states
  const isDisabled = isSaving || isRateLimited;

  return (
    <button disabled={isDisabled} onClick={onSave}>
      Save
    </button>
  );
}
```

**Key files:**

| File | Purpose |
|------|---------|
| `context/RateLimitContext.tsx` | Global rate limit state and ping polling |
| `components/ui/RateLimitBanner.tsx` | Warning banner with countdown |
| `components/ui/RateLimitTooltip.tsx` | Wrapper to disable buttons with tooltip |

**Components that require rate limit awareness:**

- Sync buttons (`SyncButton.tsx`)
- Budget inputs (`RecurringItemBudget.tsx`, `RollupStats.tsx`)
- Item actions (`ActionsDropdown.tsx` - toggle, recreate, refresh, add to rollup)
- Destructive actions (`UninstallModalFooter.tsx`, `RecurringResetModal.tsx`)

### TypeScript

**Strict typing is required.**

- No `any` types (explicit or implicit)
- No `!` non-null assertions without justification
- Use `type` imports for type-only imports
- Add return types to functions
- Define interfaces for component props

```tsx
// GOOD - Type imports
import type { FC } from 'react';
import type { CategoryGroup } from '../types';
```

### Performance

**Apply React optimizations judiciously.**

- Wrap list item components in `React.memo`
- Use `useMemo` for expensive filtered/sorted lists
- Use `useCallback` for handlers passed to memoized children
- Profile before optimizing - don't memo everything

### Code Cleanliness

**Keep the codebase clean.**

- No `console.log` statements (use `console.error` in catch blocks only)
- No commented-out code blocks
- No unused imports or variables
- Use constants for timing values, not magic numbers

```tsx
// BAD
setTimeout(() => {}, 300);

// GOOD
import { UI } from '../constants';
setTimeout(() => {}, UI.ANIMATION.NORMAL);
```

## File Structure

```
frontend/src/
├── api/           # API client and endpoints
│   ├── queries/   # React Query hooks and stores
│   │   ├── keys.ts                    # Centralized query keys
│   │   ├── categoryStoreQueries.ts    # Category metadata store
│   │   ├── categoryGroupStoreQueries.ts # Category groups store
│   │   ├── configStoreQueries.ts      # Config selectors
│   │   ├── dashboardQueries.ts        # Dashboard data
│   │   └── ...                        # Feature-specific queries
│   ├── client.ts  # Production API client
│   └── demoClient.ts # Demo mode API client
├── components/    # React components
│   ├── charts/    # Chart components (burndown, etc.)
│   ├── icons/     # SVG icon components
│   ├── layout/    # Layout components (Sidebar, AppShell)
│   ├── marketing/ # Marketing/landing page components
│   ├── recurring/ # Recurring expense components
│   ├── tabs/      # Tab panel components
│   ├── ui/        # Reusable UI components
│   └── wizards/   # Setup wizard components
├── constants/     # Shared constants
├── context/       # React contexts
├── data/          # Static data files
├── hooks/         # Custom hooks
├── pages/         # Page-level components (Login, Unlock, etc.)
├── test/          # Test utilities and setup
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

## Development Workflow

1. Run linting: `npm run lint`
2. Run type checking: `npm run type-check`
3. Run build: `npm run build`
4. Run tests: `npm test`

All checks must pass before committing.

## Dev Builds (Quick Platform Testing)

For testing platform-specific issues without running the full 18-minute release pipeline, use the dev build workflow.

### Usage

```bash
# Windows
gh workflow run "25 Dev: Build Desktop" -f platform=windows

# macOS ARM (M1/M2/M3)
gh workflow run "25 Dev: Build Desktop" -f platform=macos-arm64

# macOS Intel
gh workflow run "25 Dev: Build Desktop" -f platform=macos-x64

# Linux x64
gh workflow run "25 Dev: Build Desktop" -f platform=linux-x64

# Linux ARM
gh workflow run "25 Dev: Build Desktop" -f platform=linux-arm64

# With custom version (must be valid semver)
gh workflow run "25 Dev: Build Desktop" -f platform=windows -f version=1.2.3-test
```

Or use the GitHub UI: **Actions → "25 Dev: Build Desktop" → Run workflow**

### What It Does

| Feature | Dev Build | Full Pipeline |
|---------|-----------|---------------|
| Build time | ~5-8 min | ~18 min |
| Platforms | Single (your choice) | All platforms |
| Security scan | Skipped | Required |
| Code signing | Skipped (unsigned) | Full signing + notarization |
| Docker/Cloudflare | Skipped | Included |
| Artifacts | Private (repo members only) | Published to release |
| Retention | 7 days | 30 days |

### When to Use

- Testing platform-specific bugs
- Verifying a fix before creating a full release
- Quick iteration on desktop issues
- Testing on a specific branch before merging

### Downloading Artifacts

After the workflow completes, download from:
1. Go to the workflow run page
2. Scroll to "Artifacts" section
3. Download `dev-build-{platform}-{run_number}.zip`

## Troubleshooting Local Builds

When troubleshooting issues with local desktop builds, logs are stored in platform-specific locations.

### Log Locations by Platform

| Platform | Eclosion | Eclosion Beta |
|----------|----------|---------------|
| **macOS** | `~/Library/Application Support/Eclosion/logs/` | `~/Library/Application Support/Eclosion Beta/logs/` |
| **Windows** | `%APPDATA%\Eclosion\logs\` | `%APPDATA%\Eclosion Beta\logs\` |
| **Linux** | `~/.config/Eclosion/logs/` | `~/.config/Eclosion Beta/logs/` |

**Windows note:** `%APPDATA%` typically resolves to `C:\Users\<username>\AppData\Roaming\`.

### What's in the Logs Directory

- `main.log` - Electron main process logs (startup, IPC, system events)
- `renderer.log` - Frontend/renderer process logs (if configured)
- Crash reports and error dumps

### Quick Access Commands

```bash
# macOS - Open Eclosion logs folder
open ~/Library/Application\ Support/Eclosion/logs/

# macOS - Open Eclosion Beta logs folder
open ~/Library/Application\ Support/Eclosion\ Beta/logs/

# macOS - Tail main log in real-time
tail -f ~/Library/Application\ Support/Eclosion/logs/main.log
```

## Dependency Management

Python dependencies use **hash-pinned lockfiles** for supply chain security. When modifying dependencies:

### File Structure

| File | Purpose | Editable? |
|------|---------|-----------|
| `requirements.in` | Production deps (constraints) | Yes - add packages here |
| `requirements.txt` | Locked deps with hashes | No - auto-generated |
| `requirements-dev.in` | Dev deps (constraints) | Yes - add dev packages here |
| `requirements-dev.txt` | Locked dev deps with hashes | No - auto-generated |
| `requirements-vcs.txt` | Git/VCS dependencies | Yes - commit-pinned |
| `requirements-build.txt` | Build tools (PyInstaller) | Yes - with hashes |

### Adding Dependencies

**PyPI packages:**
```bash
# 1. Add to .in file
echo "new-package>=1.0.0" >> requirements.in

# 2. Regenerate lockfile
pip-compile --generate-hashes --allow-unsafe requirements.in
```

**Git dependencies:**
```bash
# Pin to specific commit (NOT branch)
git+https://github.com/org/repo.git@abc123def456
```

### Why This Matters

- All PyPI packages are verified via `pip install --require-hashes`
- Git dependencies are installed separately (can't be hash-verified)
- CI/CD uses `--require-hashes` flag for tamper detection
- Dockerfile uses the same pattern for container builds

## Branch Naming

**Branch names are enforced by CI.** Only these prefixes are allowed for PRs to `main`:

| Prefix | Use for | Example |
|--------|---------|---------|
| `feature/` | New features, enhancements | `feature/add-dark-mode` |
| `update/` | Fixes, refactors, docs, chores | `update/fix-login-bug` |

**Important:** Do NOT use `fix/`, `refactor/`, `docs/`, `chore/`, etc. as branch prefixes. Use `update/` for all of these.

```bash
# BAD - Will fail CI
git checkout -b fix/unused-imports
git checkout -b refactor/split-component
git checkout -b docs/update-readme

# GOOD
git checkout -b update/unused-imports
git checkout -b update/split-component
git checkout -b update/readme
git checkout -b feature/new-dashboard
```

Docs-only changes (markdown files, docusaurus, docs-gen scripts) can skip CI builds.

## Demo Mode Compatibility

**All features must work in demo mode.**

Demo mode uses localStorage instead of the backend API. The demo is hosted on Cloudflare Pages and runs entirely in the browser with no backend.

### How Demo Mode Works

Demo mode is enabled in two ways:
- **URL-based**: paths starting with `/demo/` trigger demo mode
- **Build-time**: `VITE_DEMO_MODE=true` env var enables global demo mode (used for the official demo site)

Other details:
- `useDemo()` hook returns `true` when in demo mode
- `api/queries.ts` routes to `demoClient.ts` or `client.ts` based on mode
- Data persists in localStorage under `eclosion-demo-data`

### When Adding New Features

1. **If the feature calls API endpoints**, add equivalent functions to `api/demoClient.ts`
2. **If new data structures are needed**, update `api/demoData.ts` with seed data
3. **Mutations must update localStorage** and trigger React Query invalidation
4. **Test the feature** at `/demo/recurring` and `/demo/settings`

### Demo Client Pattern

```typescript
// In api/demoClient.ts
export async function newFeatureAction(params: Params): Promise<Result> {
  const state = loadDemoState();
  // Modify state as needed
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

### Calculation Parity

**Demo mode must use the same calculation logic as the main app.**

When demo mode calculates values like status, progress, or targets, it must import and use the same functions that the real API mode uses. Do not reimplement calculation logic in demo files.

| Calculation | Shared Function | Location |
|-------------|-----------------|----------|
| Item status | `calculateItemDisplayStatus()` | `hooks/useItemDisplayStatus.ts` |
| Rollup status | `calculateDisplayStatus()` | `utils/status.ts` |
| Frozen target | `calculateFrozenTarget()` | `api/demo/demoItems.ts` (mirrors backend) |

```typescript
// BAD - Reimplementing status logic in demo
const newStatus = totalSaved >= item.amount ? 'funded' :
                 progress >= 80 ? 'on_track' : 'behind';

// GOOD - Import and use shared function
import { calculateItemDisplayStatus } from '../../hooks/useItemDisplayStatus';
const newStatus = calculateItemDisplayStatus(updatedItem);
```

The `calculateFrozenTarget` function in demo code mirrors the backend Python logic in `services/frozen_target_calculator.py`. If the backend logic changes, the demo function must be updated to match.

### Key Files

| File | Purpose |
|------|---------|
| `frontend/src/context/DemoContext.tsx` | Provides `useDemo()` hook |
| `frontend/src/api/demoClient.ts` | Re-exports from `api/demo/` modules |
| `frontend/src/api/demo/` | Modular demo implementations (demoItems.ts, demoRollup.ts, etc.) |
| `frontend/src/api/demoData.ts` | Initial seed data for demo |
| `frontend/src/api/queries.ts` | Routes queries/mutations based on demo mode |
| `frontend/src/context/DemoAuthContext.tsx` | Auth bypass for demo mode |

## Normalized Data Stores

**Use normalized stores for shared data that's accessed by multiple features.**

This pattern ensures consistent caching, prevents stale data, and enables efficient updates. All shared data should flow through React Query stores, never through direct API calls.

### When to Use Normalized Stores

Create a normalized store when:
- Multiple components need the same data (e.g., category groups used by wizards, settings, and modals)
- Data needs to be updated optimistically
- You need derived views of the same underlying data
- Direct API calls are bypassing React Query's cache

### Store Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Store Layer (single source of truth)                            │
│ - Fetches and normalizes data from API                          │
│ - Maintains entity maps: Record<id, Entity>                     │
│ - Maintains order arrays for sorted access                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Selector Layer (derived views)                                  │
│ - useCategoryGroupsList() → CategoryGroup[]                     │
│ - useCategoryGroup(id) → CategoryGroup | undefined              │
│ - useUnmappedCategoriesByGroup() → grouped structure            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Components (consume selectors)                                  │
│ - Never call API directly for shared data                       │
│ - Use selectors for read access                                 │
│ - Use cache utilities for optimistic updates                    │
└─────────────────────────────────────────────────────────────────┘
```

### Creating a New Store

1. **Create type definitions** (`types/myDataStore.ts`):

```typescript
export interface MyEntityStore {
  entities: Record<string, MyEntity>;
  entityOrder: string[];
}
```

2. **Create store queries** (`api/queries/myDataStoreQueries.ts`):

```typescript
// Main query - fetches and normalizes
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

// Selectors - derived views
export function useMyDataList(): MyEntity[] {
  const { data } = useMyDataStore();
  return data
    ? data.entityOrder
        .map((id) => data.entities[id])
        .filter((e): e is MyEntity => e !== undefined)
    : [];
}

export function useMyEntity(id: string): MyEntity | undefined {
  const { data } = useMyDataStore();
  return data?.entities[id];
}

// Cache utilities - for optimistic updates
export function useUpdateMyEntityInCache() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(
    (id: string, updates: Partial<MyEntity>) => {
      queryClient.setQueryData<MyEntityStore>(
        getQueryKey(queryKeys.myData, isDemo),
        (old) => {
          if (!old || !old.entities[id]) return old;
          return {
            ...old,
            entities: {
              ...old.entities,
              [id]: { ...old.entities[id], ...updates },
            },
          };
        }
      );
    },
    [queryClient, isDemo]
  );
}
```

3. **Export from index** (`api/queries/index.ts`):

```typescript
export {
  useMyDataStore,
  useMyDataList,
  useMyEntity,
  useUpdateMyEntityInCache,
} from './myDataStoreQueries';
```

### Existing Stores

| Store | Purpose | Key Selectors |
|-------|---------|---------------|
| `categoryStoreQueries.ts` | Category metadata for Notes and display | `useCategoriesByGroup()`, `useCategory()`, `useCategoryName()` |
| `categoryGroupStoreQueries.ts` | Category groups and unmapped categories | `useCategoryGroupsList()`, `useUnmappedCategoriesList()` |
| `configStoreQueries.ts` | App configuration (derived from dashboard) | `useConfig()`, `useIsConfigured()`, `useAutoSyncSettings()` |

### Anti-Patterns to Avoid

```typescript
// BAD - Direct API call bypasses cache
const [groups, setGroups] = useState([]);
useEffect(() => {
  client.getCategoryGroups().then(setGroups);
}, []);

// GOOD - Use the store
const { groups, isLoading } = useCategoryGroupsList();
```

```typescript
// BAD - Fetching on component mount when store already has data
const fetchData = async () => {
  const data = await api.getData();
  setLocalState(data);
};

// GOOD - Let React Query manage fetching
const { data, isLoading } = useDataStore();
```

### Cache Invalidation

When mutations affect shared data, invalidate the relevant stores:

```typescript
export function useMyMutation() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useMutation({
    mutationFn: api.doSomething,
    onSuccess: () => {
      // Invalidate affected stores
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.myData, isDemo),
      });
    },
  });
}
```

## Documentation Structure

The user-facing documentation is built with Docusaurus and located in `docusaurus/`. Documentation is auto-generated from in-app help content via `scripts/docs-gen/`.

### Documentation Hierarchy

Eclosion is a **toolkit** with multiple **features**. The docs are organized to reflect this:

```
docs/
├── intro.mdx              # Getting Started (top level)
└── recurring/             # Feature: Recurring Expenses
    ├── _category_.json    # Category metadata
    ├── overview.mdx       # Main feature overview (position 1)
    ├── setup-wizard.mdx   # Sub-feature (position 2)
    ├── rollup-category.mdx # Sub-feature (position 3)
    └── category-linking.mdx # Sub-feature (position 4)
```

**Key principles:**
1. Each major feature gets its own folder under `docs/`
2. The folder contains an `overview.mdx` as the entry point
3. Sub-features/related pages are nested within the feature folder
4. Use `_category_.json` for Docusaurus category metadata

### When Adding New Features

1. Create a new folder: `docs/{feature-name}/`
2. Add `_category_.json` with label and position
3. Add `overview.mdx` as the main entry point
4. Add sub-feature pages with appropriate `sidebar_position`
5. Update `sidebars.ts` to include the new category
6. Update `scripts/docs-gen/types.ts` DOC_MAPPINGS if auto-generating

### Auto-Generated Documentation

The docs generator (`scripts/docs-gen/`) extracts help content from TSX components and generates MDX files.

**Key files:**
- `scripts/docs-gen/types.ts` - DOC_MAPPINGS defines source files and output paths
- `scripts/docs-gen/generator.ts` - AI prompt and generation logic
- `scripts/docs-gen/manifest.ts` - Tracks changes and detects human edits

**DOC_MAPPINGS structure:**
```typescript
{
  topic: 'recurring-overview',
  sourceFiles: ['frontend/src/components/tabs/RecurringTab.tsx', ...],
  outputFile: 'docusaurus/docs/recurring/overview.mdx',
  feature: 'recurring',
  userFlow: 'main-dashboard',
  parentFeature: undefined,      // undefined for top-level, 'recurring' for sub-features
  sidebarPosition: 1,
}
```

### Human Edits and AI Merge

The doc generator preserves human edits using a "suggest, don't overwrite" approach:

| Scenario | Behavior |
|----------|----------|
| New doc (no manifest entry) | Generate fresh |
| Source changed, doc untouched | Regenerate fresh |
| Human edited, source unchanged | **Skip** (preserves human edits) |
| Human edited + source changed | **Merge mode** (AI reconciles both) |

**How it works:**
1. The manifest tracks both source content hash and generated doc hash
2. On each run, the system compares the current doc file hash to the last generated hash
3. If they differ, a human edited the doc
4. If source also changed, the AI receives both the human-edited doc and new source content
5. The AI preserves human improvements while incorporating new features

**Merge mode prompt instructs the AI to:**
- Preserve the human's tone, phrasing, and structural choices
- Incorporate new information from updated source content
- Mark uncertain changes with `<!-- REVIEW: explanation -->` comments

**Force regeneration:**
```bash
cd scripts/docs-gen
npx tsx index.ts all --force  # Ignores manifest, regenerates everything
```

### Documentation Components

Use these interactive components to make docs engaging:

**FeatureGrid + FeatureCard** - Highlight key capabilities at the top of feature pages:

```mdx
import { FeatureCard, FeatureGrid } from '@site/src/components/FeatureCard';
import { Package, ClipboardList } from 'lucide-react';

<FeatureGrid>
  <FeatureCard icon={<Package size={24} />} title="Rollup Zone" description="Combine subscriptions" />
  <FeatureCard icon={<ClipboardList size={24} />} title="Individual" description="Track bills separately" />
</FeatureGrid>
```

**WorkflowSteps** - Step-by-step instructions (3-5 steps work best):

```mdx
import { WorkflowSteps } from '@site/src/components/WorkflowSteps';

<WorkflowSteps
  title="Add a Recurring Expense"
  steps={[
    { title: "Select Add Item", description: "Click the Add Item button..." },
    { title: "Enter Details", description: "Fill in the expense name..." },
  ]}
/>
```

**AnnotatedImage** - Screenshots with numbered callouts:

```mdx
import { AnnotatedImage } from '@site/src/components/AnnotatedImage';

<AnnotatedImage
  src="/img/recurring-tab.png"
  alt="Recurring tab"
  callouts={[
    { x: 20, y: 15, label: "1", description: "The rollup zone" },
  ]}
/>
```

### Documentation Versioning

Documentation versioning differs between stable and beta sites:

| Site | Versions shown | Version dropdown |
|------|----------------|------------------|
| **Stable** (eclosion.app) | Versioned snapshots (see `docusaurus/versions.json`) | Yes |
| **Beta** (beta.eclosion.app) | Current docs only | No |

**Stable site versioning:**
- Versions are created manually when releasing stable versions
- Each version is a snapshot in `versioned_docs/`
- Current versions are listed in `docusaurus/versions.json`

```bash
cd docusaurus
# Create version snapshot for stable release (use actual version number)
npm run docusaurus docs:version X.Y
```

**Beta site versioning:**
- Shows current `docs/` folder content, labeled with the pre-release version
- Version label comes from `ECLOSION_VERSION` env var (e.g., "1.1.0-beta.20260104.1")
- Beta versions use date-based format: `v{current}-beta.{YYYYMMDD}.{sequence}`
- No version snapshots are created for beta releases
- No version dropdown (single version)
- Beta releases are created via the "Create Beta Release" workflow (manual dispatch on main)

### Environment-Aware Configuration

- **Beta mode**: Set `ECLOSION_BETA=true` to enable beta site features (announcement banner, hide version dropdown)
- **Version label**: Set `ECLOSION_VERSION` to label the docs with the pre-release version
- **Demo links**: Use relative paths (`/demo`) not absolute URLs
