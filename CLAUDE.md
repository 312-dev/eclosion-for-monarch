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

Demo mode uses localStorage instead of the backend API. The demo is hosted on GitHub Pages and runs entirely in the browser with no backend.

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
