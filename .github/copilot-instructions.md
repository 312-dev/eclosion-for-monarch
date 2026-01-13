# Copilot Instructions for Eclosion for Monarch

> **All code standards are defined in [CLAUDE.md](../CLAUDE.md)**. This file contains PR review-specific guidelines only.

---

## PR Review Guidelines

**When reviewing pull requests, evaluate ALL changes against the requirements in CLAUDE.md. Flag any violations as required changes.**

### Must Check (Block PR if violated)

1. **Component Size**: Components must not exceed 300 lines. If a component file exceeds this limit, request it be split into smaller modules.

2. **TypeScript Strictness**:
   - No `any` types (explicit or implicit)
   - No `!` non-null assertions without clear justification in comments
   - All functions must have explicit return types
   - Props must have defined interfaces

3. **Accessibility**: All interactive elements must have:
   - `aria-label` on icon-only buttons
   - `aria-expanded` on dropdown triggers
   - `aria-haspopup` on menu buttons
   - `onKeyDown` handlers on clickable `<div>` elements
   - Prefer semantic HTML (`<button>` over clickable `<div>`)

4. **No Debug Code**:
   - No `console.log` statements (only `console.error` in catch blocks)
   - No commented-out code blocks
   - No unused imports or variables

5. **Demo Mode Compatibility**: If the PR adds or modifies API calls:
   - Check for corresponding implementation in `frontend/src/api/demoClient.ts`
   - Verify seed data in `frontend/src/api/demoData.ts` if new data structures are introduced
   - Ensure queries route through `frontend/src/api/queries.ts` with demo mode support

6. **Rate Limit Handling**: If the PR adds components with Monarch API mutations:
   - Components must use `useIsRateLimited()` hook from `RateLimitContext`
   - Action buttons must be disabled when rate limited
   - Combine rate limit check with other loading states: `const isDisabled = isLoading || isRateLimited`

### Should Check (Suggest improvements)

1. **Hover States**: Should use Tailwind hover classes (`hover:bg-*`), not JS `onMouseEnter`/`onMouseLeave` handlers

2. **Icons**: Should use `Icons.*` from the centralized icon system, not inline SVGs

3. **Styling**: Should use Tailwind classes, not inline `style={}` for static values (CSS variables for theming are acceptable)

4. **Animations**: Should use centralized animation classes from `index.css` (`tab-content-enter`, `btn-press`, `list-item-enter`, etc.)

5. **Z-Index**: Should use constants from `Z_INDEX` in `constants/index.ts`, not magic numbers

6. **Error Handling**: Should use `getErrorMessage()` or `handleApiError()` from `utils/errors.ts`

7. **Timing Values**: Should use constants from `UI.ANIMATION` in `constants/index.ts`, not magic numbers like `300`

### Architecture Patterns to Verify

- **API Routes (Python)**: Must use `@async_flask` decorator for async operations
- **State Changes (Python)**: Must use `StateManager` methods, never modify JSON directly
- **API Calls (React)**: Must use typed functions from `api/client.ts`, not raw `fetch`
- **Business Logic (Python)**: Should reside in `services/` directory, not in route handlers

---

## Tool/Feature PR Checklist

When reviewing PRs that add a new tool or major feature, verify:

### Required
- [ ] Demo mode implementation exists in `demoClient.ts`
- [ ] Demo seed data added to `demoData.ts`
- [ ] Components follow 300-line limit (split if larger)
- [ ] All interactive elements have aria-labels
- [ ] Keyboard navigation works for all interactive elements
- [ ] Uses `Icons.*` instead of inline SVGs
- [ ] Uses Tailwind hover classes, not JS handlers
- [ ] No `console.log` or `any` types
- [ ] TypeScript types defined in `types/`
- [ ] API-mutating components respect rate limits (`useIsRateLimited` hook)

### Backend (if applicable)
- [ ] Routes defined in `api.py` with `@async_flask` decorator
- [ ] Business logic in `services/` directory
- [ ] State changes use `StateManager` methods
- [ ] Error handling returns proper HTTP status codes

### Testing (when test infrastructure exists)
- [ ] Unit tests for utility functions (80%+ coverage)
- [ ] Tests for custom hooks
- [ ] Integration tests for critical user flows
