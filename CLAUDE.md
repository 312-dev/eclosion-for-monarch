# CLAUDE.md - Project Guidelines

This file contains coding standards and guidelines for AI assistants working on this codebase.

## Project Overview

Eclosion for Monarch is a self-hosted toolkit that expands what's possible with Monarch Money. It features a React/TypeScript frontend and Python/Flask backend with recurring expense tracking, smart savings calculations, and direct Monarch sync. The demo mode runs entirely in the browser with localStorage.

## Code Standards

All new code must follow these standards.

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

For standardization work: `refactor/stream-{letter}-{name}`

Examples:
- `refactor/stream-a-hover-handlers`
- `refactor/stream-b-component-splitting`

## Demo Mode Compatibility

**All features must work in demo mode.**

Demo mode uses localStorage instead of the backend API. The demo is hosted on Cloudflare Pages and runs entirely in the browser with no backend.

### How Demo Mode Works

- URL-based detection: paths starting with `/demo/` trigger demo mode
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

### Key Files

| File | Purpose |
|------|---------|
| `frontend/src/context/DemoContext.tsx` | Provides `useDemo()` hook |
| `frontend/src/api/demoClient.ts` | localStorage-based API implementation |
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
- `scripts/docs-gen/manifest.ts` - Tracks changes to avoid unnecessary regeneration

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

### Documentation Components

Use these interactive components to make docs engaging:

**FeatureGrid + FeatureCard** - Highlight key capabilities at the top of feature pages:

```mdx
import { FeatureCard, FeatureGrid } from '@site/src/components/FeatureCard';

<FeatureGrid>
  <FeatureCard icon="📦" title="Rollup Zone" description="Combine subscriptions" />
  <FeatureCard icon="📋" title="Individual" description="Track bills separately" />
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

Versions are **scoped by site** - stable site shows only stable versions, beta site shows only pre-release versions.

**Creating a version (matches release):**
```bash
cd docusaurus
# For stable release (e.g., v1.1.0)
npm run docusaurus docs:version 1.1

# For pre-release (e.g., v1.2.0-beta.1)
npm run docusaurus docs:version 1.2-beta.1
```

**Then update `docusaurus.config.ts`:**
```typescript
// 1. Add version to versions object
versions: {
  current: { label: 'Next', ... },
  '1.1': { label: '1.1', banner: 'none' },           // stable
  '1.2-beta.1': { label: '1.2-beta.1', banner: 'unreleased' }, // pre-release
},

// 2. Add to appropriate onlyIncludeVersions array
onlyIncludeVersions: process.env.ECLOSION_BETA === 'true'
  ? ['current', '1.2-beta.1']  // Beta: Next + pre-release versions
  : ['1.0', '1.1'],            // Stable: Only stable versions
```

**Deployment:**
- Stable site: Shows only stable versions (1.0, 1.1, etc.)
- Beta site: `ECLOSION_BETA=true` - Shows only Next + pre-release versions

### Environment-Aware Configuration

- **Beta banner**: Set `ECLOSION_BETA=true` env var to show warning banner
- **Demo links**: Use relative paths (`/demo`) not absolute URLs
- **Default version**: Set `DOCS_LAST_VERSION` to control which version loads by default
