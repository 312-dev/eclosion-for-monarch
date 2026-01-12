"""
Integration test fixtures for Monarch Money API tests.

These tests run against a real Monarch account. They are designed to be non-destructive:
- Create temporary test data with obvious prefixes
- Clean up all test data after each test
- Skip unless INTEGRATION_TEST=true is set

RATE LIMITING:
- Tests include automatic delays between API calls to avoid hitting rate limits
- Session-scoped fixtures cache data to minimize redundant API calls
- The RateLimiter class tracks calls and enforces minimum delays

Required environment variables:
- MONARCH_EMAIL: Your Monarch account email
- MONARCH_PASSWORD: Your Monarch account password
- MFA_SECRET_KEY: Your TOTP secret (optional, only if MFA is enabled)
"""

import asyncio
import os
import time
from datetime import datetime
from typing import Any, ClassVar

import pytest
import pytest_asyncio
from monarchmoney import MonarchMoney

# =============================================================================
# RATE LIMITING CONFIGURATION
# =============================================================================

# Minimum delay between API calls (seconds)
MIN_DELAY_BETWEEN_CALLS = 0.5

# Delay after write operations (create/update/delete) - be more conservative
WRITE_OPERATION_DELAY = 1.0

# Delay between tests to let any rate limit windows reset
DELAY_BETWEEN_TESTS = 0.5

# Maximum API calls per minute (conservative estimate)
MAX_CALLS_PER_MINUTE = 30


class RateLimiter:
    """
    Simple rate limiter to prevent hitting Monarch API limits.

    Tracks API calls and enforces minimum delays between them.
    """

    def __init__(
        self,
        min_delay: float = MIN_DELAY_BETWEEN_CALLS,
        write_delay: float = WRITE_OPERATION_DELAY,
        max_per_minute: int = MAX_CALLS_PER_MINUTE,
    ):
        self.min_delay = min_delay
        self.write_delay = write_delay
        self.max_per_minute = max_per_minute
        self.call_times: list[float] = []
        self.last_call_time: float = 0

    async def wait_if_needed(self, is_write: bool = False) -> None:
        """Wait if necessary to respect rate limits."""
        now = time.time()

        # Clean up old call times (older than 1 minute)
        self.call_times = [t for t in self.call_times if now - t < 60]

        # Check if we're approaching the per-minute limit
        if len(self.call_times) >= self.max_per_minute - 5:
            # Wait until the oldest call is more than 60 seconds old
            oldest = min(self.call_times) if self.call_times else now
            wait_time = max(0, 60 - (now - oldest) + 1)
            if wait_time > 0:
                print(f"  [Rate limit] Approaching limit, waiting {wait_time:.1f}s...")
                await asyncio.sleep(wait_time)
                now = time.time()

        # Enforce minimum delay between calls
        delay = self.write_delay if is_write else self.min_delay
        time_since_last = now - self.last_call_time
        if time_since_last < delay:
            wait_time = delay - time_since_last
            await asyncio.sleep(wait_time)

        # Record this call
        self.call_times.append(time.time())
        self.last_call_time = time.time()

    def get_stats(self) -> dict[str, Any]:
        """Get rate limiter statistics."""
        now = time.time()
        recent_calls = [t for t in self.call_times if now - t < 60]
        return {
            "calls_last_minute": len(recent_calls),
            "max_per_minute": self.max_per_minute,
            "headroom": self.max_per_minute - len(recent_calls),
        }


# Global rate limiter instance
_rate_limiter = RateLimiter()


class RateLimitedMonarchClient:
    """
    Wrapper around MonarchMoney client that adds rate limiting.

    All API methods go through the rate limiter before executing.
    """

    # Methods that modify data (need longer delays)
    WRITE_METHODS: ClassVar[set[str]] = {
        "create_transaction_category",
        "delete_transaction_category",
        "set_budget_amount",
        "update_transaction",
        "update_flexible_budget",
    }

    def __init__(self, client: MonarchMoney, rate_limiter: RateLimiter):
        self._client = client
        self._rate_limiter = rate_limiter

    def __getattr__(self, name: str):
        """Wrap all client methods with rate limiting."""
        attr = getattr(self._client, name)

        if not callable(attr):
            return attr

        async def rate_limited_method(*args, **kwargs):
            is_write = name in self.WRITE_METHODS
            await self._rate_limiter.wait_if_needed(is_write=is_write)
            return await attr(*args, **kwargs)

        # For sync methods, return as-is
        if not asyncio.iscoroutinefunction(attr):
            return attr

        return rate_limited_method

    @property
    def token(self):
        """Expose token property."""
        return self._client.token


# =============================================================================
# PYTEST CONFIGURATION
# =============================================================================


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line("markers", "integration: mark test as integration test")
    config.addinivalue_line("markers", "slow: mark test as slow (makes many API calls)")


def pytest_collection_modifyitems(config, items):
    """Skip integration tests unless INTEGRATION_TEST env var is set."""
    if os.getenv("INTEGRATION_TEST", "").lower() != "true":
        skip_integration = pytest.mark.skip(
            reason="Integration tests require INTEGRATION_TEST=true"
        )
        for item in items:
            if "integration" in item.keywords or "tests/integration" in str(item.fspath):
                item.add_marker(skip_integration)


@pytest.hookimpl(tryfirst=True)
def pytest_runtest_setup(item):
    """Add delay between tests to avoid rate limiting."""
    # Small delay before each test
    time.sleep(DELAY_BETWEEN_TESTS)


def pytest_sessionfinish(session, exitstatus):
    """Print rate limiter stats at end of session."""
    stats = _rate_limiter.get_stats()
    print(f"\n[Rate Limiter] Final stats: {stats['calls_last_minute']} calls in last minute")


# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def _raw_monarch_client():
    """
    Raw authenticated Monarch client (internal use).

    Use `monarch_client` fixture instead - it includes rate limiting.
    """
    email = os.environ.get("MONARCH_EMAIL")
    password = os.environ.get("MONARCH_PASSWORD")
    mfa_secret = os.environ.get("MFA_SECRET_KEY", "")

    if not email or not password:
        pytest.skip("MONARCH_EMAIL and MONARCH_PASSWORD must be set")

    client = MonarchMoney()
    await client.login(
        email=email,
        password=password,
        mfa_secret_key=mfa_secret if mfa_secret else None,
    )
    yield client


@pytest_asyncio.fixture(scope="session")
async def monarch_client(_raw_monarch_client):
    """
    Rate-limited Monarch client for the test session.

    This client automatically adds delays between API calls to avoid
    hitting Monarch's rate limits. All tests should use this fixture.
    """
    yield RateLimitedMonarchClient(_raw_monarch_client, _rate_limiter)


@pytest.fixture
def rate_limiter():
    """Access to the rate limiter for checking stats in tests."""
    return _rate_limiter


# =============================================================================
# CACHED DATA FIXTURES (reduce API calls)
# =============================================================================


@pytest_asyncio.fixture(scope="session")
async def cached_category_groups(monarch_client):
    """
    Session-cached category groups.

    Fetched once per test session to avoid redundant API calls.
    """
    result = await monarch_client.get_transaction_category_groups()
    return result.get("categoryGroups", [])


@pytest_asyncio.fixture(scope="session")
async def cached_categories(monarch_client):
    """
    Session-cached categories.

    Fetched once per test session to avoid redundant API calls.
    """
    return await monarch_client.get_transaction_categories()


@pytest_asyncio.fixture(scope="session")
async def default_group_id(cached_category_groups):
    """
    Default category group ID for creating test categories.

    Uses cached data to avoid extra API calls.
    """
    if cached_category_groups:
        return cached_category_groups[0]["id"]
    return None


# =============================================================================
# TEST DATA FIXTURES
# =============================================================================


@pytest.fixture
def test_category_prefix():
    """Prefix for test categories - makes identification and cleanup easy."""
    return "ECLOSION-TEST"


@pytest.fixture
def unique_test_name(test_category_prefix):
    """Generate a unique test name with timestamp."""
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    return f"{test_category_prefix}-{timestamp}"


@pytest_asyncio.fixture
async def test_category(monarch_client, unique_test_name, default_group_id):
    """
    Create a temporary test category that is automatically cleaned up.

    Yields the category ID for use in tests.
    """
    # Create the test category
    result = await monarch_client.create_transaction_category(
        name=unique_test_name,
        group_id=default_group_id,
    )

    # The API returns different structures, handle both cases
    cat_id = result.get("id") if isinstance(result, dict) else result

    yield cat_id

    # Cleanup: delete the test category
    try:
        await monarch_client.delete_transaction_category(cat_id)
    except Exception as e:
        # Log but don't fail the test if cleanup fails
        print(f"Warning: Failed to cleanup test category {cat_id}: {e}")


# =============================================================================
# CLEANUP UTILITIES
# =============================================================================


async def cleanup_orphaned_test_categories(monarch_client, prefix="ECLOSION-TEST"):
    """
    Utility to clean up any orphaned test categories.

    Run this manually if tests fail and leave behind test data:
        pytest tests/integration/conftest.py::test_cleanup_orphaned -v

    Or call directly:
        await cleanup_orphaned_test_categories(client)
    """
    categories = await monarch_client.get_transaction_categories()
    deleted = 0

    for cat in categories:
        name = cat.get("name", "")
        if prefix in name:
            try:
                await monarch_client.delete_transaction_category(cat["id"])
                print(f"Deleted orphaned test category: {name}")
                deleted += 1
                # Extra delay after each delete to be safe
                await asyncio.sleep(WRITE_OPERATION_DELAY)
            except Exception as e:
                print(f"Failed to delete {name}: {e}")

    return deleted


@pytest.mark.integration
@pytest.mark.asyncio
async def test_cleanup_orphaned(monarch_client):
    """
    Utility test to clean up orphaned test categories.

    Run with: INTEGRATION_TEST=true pytest tests/integration/conftest.py::test_cleanup_orphaned -v
    """
    deleted = await cleanup_orphaned_test_categories(monarch_client)
    print(f"Cleaned up {deleted} orphaned test categories")


# =============================================================================
# HELPER FUNCTIONS FOR TESTS
# =============================================================================


def _extract_category_id(result: Any) -> str | None:
    """Extract category ID from various API response formats."""
    if not isinstance(result, dict):
        return result

    # Direct ID in result
    if result.get("id"):
        return result["id"]

    # Nested in createCategory response
    create_response = result.get("createCategory", {})
    return create_response.get("category", {}).get("id")


def _is_rate_limit_error(error: Exception) -> bool:
    """Check if an exception indicates a rate limit error."""
    error_str = str(error).lower()
    rate_limit_indicators = ("rate", "429", "too many")
    return any(indicator in error_str for indicator in rate_limit_indicators)


async def create_test_category_with_retry(
    monarch_client,
    name: str,
    group_id: str | None,
    max_retries: int = 3,
) -> str:
    """
    Create a test category with retry logic for rate limit handling.

    Returns the category ID.
    """
    last_error = None

    for attempt in range(max_retries):
        try:
            result = await monarch_client.create_transaction_category(
                name=name,
                group_id=group_id,
            )
            cat_id = _extract_category_id(result)
            if cat_id:
                return cat_id

        except Exception as e:
            last_error = e
            if not _is_rate_limit_error(e):
                raise
            wait_time = (attempt + 1) * 5  # 5s, 10s, 15s
            print(f"  [Rate limit] Waiting {wait_time}s before retry...")
            await asyncio.sleep(wait_time)

    if last_error:
        raise last_error
    raise RuntimeError("Failed to create category after retries")
