# Testing Strategy

## Layers

| Layer | Location | When | What |
|-------|----------|------|------|
| Integration | `tests/integration/` | Before releases | Real Monarch API |
| E2E | `desktop/e2e/` | Every PR | Demo mode UI flows |
| Unit | `tests/`, `frontend/src/**/*.test.*` | Every PR | Mocked business logic |
| Static | All code | Every PR | Types, lint, format |

## Integration Tests

Test against real Monarch API. All writes follow create → test → cleanup in `try/finally`. Include safety tests verifying no side effects on other data.

New Monarch API calls MUST have integration tests. `scripts/check-monarch-api-coverage.py` enforces this in CI.

Test files: `test_api_coverage.py`, `test_services.py`, `test_category_lifecycle.py`, `test_budget_operations.py`, `test_sync_readonly.py`, `test_authentication.py`.
