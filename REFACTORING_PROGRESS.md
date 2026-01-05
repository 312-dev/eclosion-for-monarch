# Refactoring Progress

Tracking file for the ongoing codebase refactoring to comply with the 300-line max-lines ESLint rule.

## Completed

| File | Original Lines | New Lines | Strategy |
|------|----------------|-----------|----------|
| `frontend/src/components/tabs/SettingsTab.tsx` | 1,035 | 209 | Extracted 10 components to `/components/settings/` |
| `frontend/src/api/demoClient.ts` | 931 | 11 | Split into 8 domain modules in `/api/demo/` |
| `frontend/src/api/client.ts` | 579 | 9 | Split into 9 domain modules in `/api/core/` |
| `frontend/src/components/RollupZone.tsx` | 513 | 230 | Extracted 4 components to `/components/rollup/` |
| `frontend/src/api/queries.ts` | 643 | 11 | Split into 9 domain modules in `/api/queries/` |
| `frontend/src/components/SetupWizard.tsx` | 567 | 174 | Extracted `useSetupWizard` hook + 3 components |
| `frontend/src/components/wizards/RecurringSetupWizard.tsx` | 536 | 158 | Extracted `useRecurringSetupWizard` hook |

## In Progress

| File | Lines | Notes |
|------|-------|-------|
| Wizard components | Various | ItemSelectionStep, WizardComponents need splitting |

## Remaining (Over 300 Lines)

| File | Lines | Priority |
|------|-------|----------|
| `frontend/src/components/wizards/steps/ItemSelectionStep.tsx` | 484 | High |
| `frontend/src/components/wizards/WizardComponents.tsx` | 471 | High |
| `frontend/src/components/UninstallModal.tsx` | 442 | Medium |
| `frontend/src/hooks/useSetupWizard.ts` | 388 | Low (new hook) |
| `frontend/src/hooks/useRecurringSetupWizard.ts` | 339 | Low (new hook) |
| `frontend/src/components/ImportSettingsModal.tsx` | 379 | Medium |
| `frontend/src/components/UpdateModal.tsx` | 376 | Medium |
| `frontend/src/components/ui/GetStartedModal.tsx` | 362 | Medium |
| `frontend/src/components/settings/RecurringToolSettings.tsx` | 360 | Medium |
| `frontend/src/components/layout/AppShell.tsx` | 353 | Medium |
| `frontend/src/pages/DocsPage.tsx` | 350 | Medium |
| `frontend/src/components/RecurringList.tsx` | 344 | Medium |

## Skipped (Per User Request)

| File | Lines | Reason |
|------|-------|--------|
| `frontend/src/components/icons/index.tsx` | 450 | Icon barrel file, intentionally kept together |
| `frontend/src/api/demoData.ts` | 535 | Demo seed data, intentionally kept together |

## New Files Created

### Hooks
- `frontend/src/hooks/useAsyncAction.ts` - Async action with loading state
- `frontend/src/hooks/useItemDisplayStatus.ts` - Status calculation for recurring items
- `frontend/src/hooks/useApiClient.ts` - Demo/prod API client selection
- `frontend/src/hooks/useSetupWizard.ts` - Setup wizard state management
- `frontend/src/hooks/useRecurringSetupWizard.ts` - Recurring wizard state management

### Components
- `frontend/src/components/settings/` - 10 settings sub-components
- `frontend/src/components/rollup/` - 4 rollup sub-components
- `frontend/src/components/wizards/RollupTipModal.tsx`
- `frontend/src/components/wizards/SetupWizardFooter.tsx`
- `frontend/src/components/wizards/tourSteps.tsx`

### API Modules
- `frontend/src/api/demo/` - 9 demo client modules
- `frontend/src/api/core/` - 10 production client modules
- `frontend/src/api/queries/` - 9 query/mutation modules

## Progress Summary

- **Started with**: 18 max-lines ESLint warnings
- **Current**: 12 max-lines ESLint warnings
- **Tests**: 154 passing
- **Build**: Compiling successfully
