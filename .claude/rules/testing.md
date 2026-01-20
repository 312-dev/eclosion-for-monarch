# Testing Strategy

This project uses a multi-layer testing approach.

## Test Pyramid

| Layer | Location | When | What |
|-------|----------|------|------|
| Integration | `tests/integration/` | Before releases | Real Monarch API + services |
| E2E | `desktop/e2e/` | Every PR/push | UI flows in demo mode |
| Unit | `tests/`, `frontend/src/**/*.test.*` | Every PR/push | Business logic with mocks |
| Static | All code | Every PR/push | Types, linting, formatting |

## Integration Tests

Integration tests test against the **real Monarch API** and live in `tests/integration/`.

**Test Files:**
- `test_api_coverage.py` - API functions return expected structures
- `test_services.py` - Service classes work with real API
- `test_category_lifecycle.py` - Category CRUD
- `test_budget_operations.py` - Budget amounts
- `test_sync_readonly.py` - Read-only sync
- `test_authentication.py` - Login and MFA

### Non-Destructive Pattern

All write tests follow create → test → cleanup:

```python
@pytest.mark.integration
@pytest.mark.asyncio
async def test_example(monarch_client, unique_test_name):
    """Test with automatic cleanup."""
    cat_id = None
    try:
        cat_id = await monarch_client.create_transaction_category(
            name=unique_test_name,  # "ECLOSION-TEST-20260112-123456"
            group_id=group_id,
        )
        assert cat_id is not None
    finally:
        if cat_id:
            await monarch_client.delete_transaction_category(cat_id)
```

### Adding New Monarch API Calls

When you add new Monarch API usage, you MUST add integration tests:
1. Add the API call to your service code
2. Add tests in `tests/integration/`
3. CI check `Check Monarch API integration test coverage` will fail if missing

The coverage checker (`scripts/check-monarch-api-coverage.py`) detects all `mm.method()` calls and ensures each has a test.

### Safety Tests

Include explicit safety verification:

```python
async def test_delete_only_deletes_specified_category():
    """SAFETY: Verify delete doesn't affect other categories."""
    # Count before, create, delete, verify count unchanged
```
