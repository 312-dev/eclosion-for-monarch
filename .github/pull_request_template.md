## Summary

Brief description of changes and motivation.

## Changes

- Change 1
- Change 2

---

> **Note:** Copilot will automatically review this PR against project standards defined in [copilot-instructions.md](.github/copilot-instructions.md). Address any flagged issues before requesting human review.

---

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] New tool/major feature (see checklist below)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Dependencies update

## Testing

Describe how you tested these changes:

- [ ] Tested locally with `npm run dev` / `python app.py`
- [ ] Verified Docker build works
- [ ] Added/updated tests (if applicable)

## Checklist

- [ ] My code follows the project's code style (see [CLAUDE.md](../CLAUDE.md))
- [ ] I have run `npm run lint` and `ruff check .` locally
- [ ] I have updated documentation if needed
- [ ] My changes generate no new warnings
- [ ] Any dependent changes have been merged and published

## New Tool/Feature Checklist

If adding a new tool or major feature, complete this section:

### Demo Mode
- [ ] Demo mode implementation exists in `frontend/src/api/demoClient.ts`
- [ ] Demo seed data added to `frontend/src/api/demoData.ts`
- [ ] Tested at `/demo/recurring` and `/demo/settings`

### Code Standards
- [ ] Components follow 300-line limit (split if larger)
- [ ] All interactive elements have aria-labels
- [ ] Keyboard navigation works for all interactive elements
- [ ] Uses `Icons.*` instead of inline SVGs
- [ ] Uses Tailwind hover classes, not JS handlers
- [ ] No `console.log` or `any` types

### Backend (if applicable)
- [ ] Routes defined in `api.py` with `@async_flask` decorator
- [ ] Business logic in `services/` directory
- [ ] State changes use `StateManager` methods

## Screenshots (if applicable)

Add screenshots for UI changes.

## Related Issues

Closes #(issue number)
