# CLAUDE.md - Project Guidelines

This file contains coding standards and guidelines for AI assistants working on this codebase.

## Project Overview

Eclosion for Monarch is a self-hosted toolkit that expands what's possible with Monarch Money. It features a React/TypeScript frontend and Python/Flask backend with recurring expense tracking, smart savings calculations, and direct Monarch sync. The demo mode runs entirely in the browser with localStorage.

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

Rounding rules (also documented in `constants/index.ts`):

| Context | Method | Reason |
|---------|--------|--------|
| Monthly targets | `Math.ceil()` | Round UP to ensure enough is saved |
| Balance comparisons | `Math.round()` | Standard rounding for display |
| Currency display | `maximumFractionDigits: 0` | No cents shown |

```typescript
// Backend (Python)
ideal_monthly_rate = math.ceil(target_amount / frequency_months)
frozen_target = math.ceil(shortfall / months_remaining)

// Frontend (TypeScript)
const targetRounded = Math.ceil(item.frozen_monthly_target);
const balanceRounded = Math.round(item.current_balance);
formatCurrency(amount, { maximumFractionDigits: 0 })
```

Example: If a $100 yearly expense calculates to $8.33/month, we round UP to $9/month to ensure the user saves enough ($108 total, providing a small buffer).

### Status Badge Calculation

**Status badges indicate whether users are on track with their savings.**

The status is determined by comparing the user's **budget** (what they're allocating monthly) against the **effective target** (what they need to allocate).

**Key concept: Effective Target**

The effective target varies based on expense frequency:

| Frequency | When Funded | Effective Target | Reason |
|-----------|-------------|------------------|--------|
| Monthly (≤1 mo) | Balance ≥ Amount | frozen_monthly_target | Next month's bill is coming |
| Infrequent (>1 mo) | Balance ≥ Amount | $0 | Done saving until reset |

**Status Logic (in `useItemDisplayStatus.ts`):**

```typescript
// For monthly expenses: always use the target
// For yearly/quarterly: target becomes $0 when funded
const effectiveTarget = (isFunded && frequency_months > 1) ? 0 : target;

if (budget > effectiveTarget) return 'ahead';
if (budget >= effectiveTarget) return isFunded ? 'funded' : 'on_track';
if (trajectoryReachesGoal) return 'ahead';
return 'behind';
```

**Examples:**

| Expense | Balance | Budget | Target | Status | Why |
|---------|---------|--------|--------|--------|-----|
| $600/yr | $300 | $75 | $50 | Ahead | Budgeting more than needed |
| $600/yr | $600 | $50 | $0 | Ahead | Still budgeting when funded |
| $600/yr | $600 | $0 | $0 | Funded | Done saving, correct behavior |
| $80/mo | $80 | $80 | $80 | Funded | On track for next month |
| $80/mo | $80 | $50 | $80 | Behind | Won't have enough next month |

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

## Branch Naming

**Branch names are enforced by CI.** Only these prefixes are allowed for PRs to `develop`:

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

PRs to `main` must come from the `develop` branch only (enforced by `require-develop.yml`).

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
- Beta releases are created via the "Create Beta Release" workflow (manual dispatch on develop)

### Environment-Aware Configuration

- **Beta mode**: Set `ECLOSION_BETA=true` to enable beta site features (announcement banner, hide version dropdown)
- **Version label**: Set `ECLOSION_VERSION` to label the docs with the pre-release version
- **Demo links**: Use relative paths (`/demo`) not absolute URLs
