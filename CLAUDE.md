# CLAUDE.md

Eclosion for Monarch: React/TypeScript frontend + Python/Flask backend for recurring expense tracking with Monarch Money sync. Demo mode runs entirely in browser with localStorage.

## Commands

```bash
npm run lint       # ESLint
npm run type-check # TypeScript
npm run build      # Production build
npm test           # Vitest tests
./scripts/dev.sh   # Dev mode with hot reload (Electron + Vite + Flask)
```

All checks must pass before committing.

## Electron Dev Mode

`./scripts/dev.sh` runs the desktop app with live reload for rapid development:
- Launches Electron loading frontend from Vite dev server (React HMR)
- Connects to external Flask server (auto-reloads on Python changes)
- Electron main process reloads via electronmon on TypeScript changes
- Finds available ports automatically (avoids conflicts with production instances)
- Uses Beta app's state directory for shared credentials/data
- **Ctrl+C** cleanly stops all processes

## Code Standards

### TypeScript

- No `any` types (explicit or implicit)
- No `!` assertions without justification
- Use `type` imports for type-only imports
- Define interfaces for component props

### Components

- **Max 300 lines** - split into focused modules
- Use Tailwind classes over inline styles
- Use CSS/Tailwind for hover effects, not JS handlers
- Use the centralized icon system (`Icons.Setting`), not inline SVGs

### Accessibility

Required on interactive elements:
- `aria-label` on icon-only buttons
- `aria-expanded` on dropdown triggers
- Keyboard handlers on clickable `<div>` elements
- Use `<button>` for clickable elements, not `<div>`

### Testing

- New components/utilities require tests (Vitest + RTL)
- Utility functions: 80%+ coverage
- Custom hooks must have tests

### Animation

Use centralized animation classes from `index.css`:
- `tab-content-enter`, `section-enter` - page transitions
- `btn-press`, `icon-btn-hover` - micro-interactions
- `list-item-enter`, `list-item-highlight` - list animations
- `fade-in`, `slide-up`, `scale-in` - utilities

### Z-Index Scale

```typescript
DROPDOWN: 10, STICKY: 20, POPOVER: 30, MODAL_BACKDROP: 40, MODAL: 50, TOAST: 60, TOOLTIP: 70
```

Import: `import { Z_INDEX } from '../constants';`

### Code Cleanliness

- No `console.log` (use `console.error` in catch blocks only)
- No commented-out code
- No unused imports/variables
- Use constants for timing values: `import { UI } from '../constants';`

## Key Patterns

### Error Handling

```typescript
import { getErrorMessage, handleApiError } from '../utils/errors';
catch (error) {
  const message = handleApiError(error, 'Failed to load data');
  setError(message);
}
```

### Rate Limit Handling

Components with Monarch API mutations must respect rate limits:

```tsx
import { useIsRateLimited } from '../../context/RateLimitContext';
const isDisabled = isSaving || isRateLimited;
```

### Currency Rounding

Monarch doesn't support cents. Use `roundMonthlyRate()` which rounds with min $1:

```typescript
// Frontend: utils/calculations.ts
export function roundMonthlyRate(rate: number): number {
  if (rate <= 0) return 0;
  return Math.max(1, Math.round(rate));
}
```

### Status Badge Logic

```typescript
// Priority 1: If balance >= amount, status is 'funded'
// Priority 2: Compare budget vs target for 'ahead', 'on_track', 'behind'
// See: hooks/useItemDisplayStatus.ts
```

## File Structure

```
frontend/src/
├── api/           # API client, queries/, demoClient
├── components/    # charts/, icons/, layout/, recurring/, tabs/, ui/, wizards/
├── constants/     # Shared constants (Z_INDEX, UI timings)
├── context/       # React contexts
├── hooks/         # Custom hooks
├── types/         # TypeScript types
└── utils/         # Utility functions
```

## Gotchas

- **Demo mode**: All features must work in demo mode (see `.claude/rules/demo-mode.md`)
- **Integration tests required**: New Monarch API calls need tests in `tests/integration/`
- **Branch naming**: Only `feature/` and `update/` prefixes allowed (no `fix/`, `refactor/`)
- **Calculation parity**: Demo mode must import shared calculation functions, not reimplement
- **Hash-pinned deps**: Python deps use lockfiles with hashes for security

## Detailed Rules

Extended documentation is auto-loaded from `.claude/rules/`:

- **testing.md** - Test pyramid, integration test patterns, safety tests
- **demo-mode.md** - Demo compatibility, client patterns, calculation parity
- **data-stores.md** - Normalized React Query stores, selectors, cache patterns
- **documentation.md** - Docusaurus structure, auto-generation, versioning
- **workflows.md** - Dev builds, troubleshooting, git hooks, dependencies
