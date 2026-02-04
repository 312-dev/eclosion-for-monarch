# CLAUDE.md - Project Guidelines

## Project Overview

Eclosion for Monarch: React/TypeScript frontend + Python/Flask backend. Features recurring expense tracking, monthly category notes, Monarch sync. Demo mode runs in-browser with localStorage.

## Code Standards

Update code you touch to follow these standards.

### Hover States
Use Tailwind hover variants (`hover:bg-(--monarch-bg-page)`), not JS `onMouseEnter`/`onMouseLeave`. Exception: complex stateful logic CSS can't handle.

### Component Size
Max 300 lines. Split into focused modules, extract sub-components, use custom hooks for logic.

### Accessibility
- `aria-label` on icon-only buttons, `aria-expanded` on dropdowns, `aria-haspopup` on menus
- Clickable `<div>` needs `onKeyDown`; dropdowns need arrow keys; modals trap focus + Escape
- Use `<button>` not `<div>`, semantic elements (`<nav>`, `<main>`, `<aside>`), proper heading hierarchy

### Testing
Vitest + React Testing Library. 80%+ coverage on utils. All hooks tested. Critical flows need integration tests. Use custom `render()` from `frontend/src/test/test-utils.tsx` (wraps QueryClient, MemoryRouter, Theme, Toast, Tooltip, DistributionMode providers). Setup in `test/setup.ts` mocks localStorage, matchMedia, and injects build globals.

### Icons
Use `<Icons.Name />` from `components/icons/`, not inline SVGs.

### Styling
Tailwind classes over inline styles. CSS variables OK for dynamic theming (`var(--monarch-text-dark)`).

### Z-Index
Use `Z_INDEX` from `constants/`: DROPDOWN:10, STICKY:20, POPOVER:30, MODAL_BACKDROP:40, MODAL:50, TOAST:60, TOOLTIP:70.

### Animations
Use centralized classes from `index.css`. CSS timing: `--animation-fast:150ms`, `--animation-normal:200ms`, `--animation-slow:300ms`. TS constants in `constants/index.ts` differ (150/300/500ms) for programmatic delays.

Key classes: `tab-content-enter`, `section-enter`, `btn-press`, `icon-btn-hover`, `toggle-switch`/`toggle-knob`, `list-item-enter`, `list-item-highlight`, `animate-error-shake`, `animate-success`, `animate-loading`, `fade-in/out`, `slide-up/down`, `scale-in`, `pop-in`, `transition-fast/normal/slow`.

### Currency Rounding
Monarch doesn't support cents. Use `roundMonthlyRate()` (frontend `utils/calculations.ts`) / `round_monthly_rate()` (backend `services/stash_service.py`): standard rounding, min $1 for non-zero. Display with `maximumFractionDigits: 0`.

### Status Badge Calculation
In `useItemDisplayStatus.ts`: if `balance >= amount` → funded; if `budget > target` → ahead; if `budget >= target` → on_track; else → behind. Funded takes priority.

### Error Handling
Use `handleApiError()`, `getErrorMessage()`, `isRateLimitError()` from `utils/errors`.

### Toast Notifications
Use `useToast()` from `context/ToastContext`: `toast.success/error/warning/info(msg, duration?)`. Duration 0 = manual dismiss. Use toasts for confirmations/errors, inline errors for form fields, modals for destructive confirmations.

### Rate Limit Handling
API-mutating components must use `useIsRateLimited()` from `context/RateLimitContext` to disable actions during 429 state. Key files: `RateLimitContext.tsx`, `RateLimitBanner.tsx`, `RateLimitTooltip.tsx`.

### API Core
Use `fetchApi()` from `api/core/`, not raw fetch. Features: request deduplication, rate limit handling (`RateLimitError`), desktop auth headers (`X-Desktop-Secret`, `X-Notes-Key`), custom events (`monarch-rate-limited`, `auth-required`). New endpoints: add to `api/client.ts` + `api/demo/*.ts`, create React Query hook in `api/queries/` routing via `useDemo()`.

### TypeScript
No `any`, no unguarded `!` assertions, use `type` imports, return types on functions, interfaces for props.

### Performance
`React.memo` on list items, `useMemo` for expensive lists, `useCallback` for handlers to memoized children. Profile first.

### Code Cleanliness
No `console.log` (only `console.error` in catch), no commented-out code, no unused imports. Use constants for timing (`UI.ANIMATION.NORMAL`), not magic numbers.

## File Structure

```
frontend/src/
├── api/           # client.ts (prod), demoClient.ts (demo), core/ (fetchApi), demo/, queries/
├── components/    # charts, icons, import, layout, login, marketing, notes, recurring, rollup, settings, stash, tabs, ui, uninstall, wizards
├── constants/     # Shared constants
├── context/       # React contexts
├── hooks/         # Custom hooks
├── pages/         # Page-level components
├── test/          # Test utilities
├── types/         # TypeScript types
└── utils/         # Utility functions
```

## Dev Commands

```bash
npm run lint        # Linting
npm run type-check  # Type checking
npm run build       # Build
npm test            # Tests
```

All must pass before committing.

## Branch Naming (CI-enforced)

- `feature/` — new features, enhancements
- `update/` — fixes, refactors, docs, chores

Do NOT use `fix/`, `refactor/`, `docs/`, `chore/`.

## Environment Detection

Use `utils/environment.ts`: `isBetaEnvironment()`, `getDocsBaseUrl()`, `getSiteBaseUrl()`. Desktop: `!!window.electron`. Build globals: `__APP_VERSION__`, `__BUILD_TIME__`, `__DEMO_MODE__`, `__CHANGELOG__`. localStorage keys use `eclosion-` prefix.
