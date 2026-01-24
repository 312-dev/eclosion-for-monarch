import asyncio
import contextlib
import os
import platform
import re
import uuid
from datetime import datetime, timedelta
from typing import Any

from cachetools import TTLCache
from dotenv import load_dotenv
from monarchmoney import MonarchMoney

from core import config
from core.error_detection import is_rate_limit_error

load_dotenv()


# =============================================================================
# Monarch API Client Configuration
# =============================================================================
# Custom headers for client identification to avoid Cloudflare issues (525 errors)


def _get_device_uuid() -> str:
    """Generate a persistent device UUID based on machine identifier."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"eclosion-{uuid.getnode()}"))


def _get_platform_ua() -> str:
    """Build platform-specific User-Agent string component."""
    system = platform.system()
    if system == "Darwin":
        mac_ver = platform.mac_ver()[0].replace(".", "_") or "10_15_7"
        return f"Macintosh; Intel Mac OS X {mac_ver}"
    elif system == "Windows":
        win_ver = platform.release() or "10"
        return f"Windows NT {win_ver}; Win64; x64"
    else:
        return "X11; Linux x86_64"


def _get_user_agent() -> str:
    """Build browser-like User-Agent with dynamic Chrome version from Electron."""
    chrome_version = os.environ.get("CHROME_VERSION", "142.0.0.0")
    platform_ua = _get_platform_ua()
    return f"Mozilla/5.0 ({platform_ua}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome_version} Safari/537.36"


def _get_monarch_client_config() -> dict[str, Any]:
    """
    Get configuration for MonarchMoney client headers.

    Returns dict with keys matching MonarchMoney __init__ parameters:
    - device_uuid: Persistent UUID for this installation
    - monarch_client: "eclosion"
    - monarch_client_version: From APP_VERSION env var
    - user_agent: Browser-like UA with platform and Chrome version
    """
    app_version = os.environ.get("APP_VERSION", "1.0.0")

    config_dict = {
        "device_uuid": _get_device_uuid(),
        "monarch_client": "eclosion",
        "monarch_client_version": app_version,
        "user_agent": _get_user_agent(),
    }

    # Debug logging for beta builds
    if os.environ.get("RELEASE_CHANNEL") == "beta":
        print(f"[MonarchMoney] Platform: {platform.system()} ({_get_platform_ua()})")
        print(
            f"[MonarchMoney] Chrome version from env: {os.environ.get('CHROME_VERSION', '(not set)')}"
        )
        print(f"[MonarchMoney] App version from env: {app_version}")
        print(f"[MonarchMoney] Device UUID: {config_dict['device_uuid']}")
        print(f"[MonarchMoney] User-Agent: {config_dict['user_agent']}")

    return config_dict


# Helper to strip leading emoji and space from a string
# Handles multi-codepoint emoji:
# - Basic emoji (single codepoint)
# - Emoji with variation selector (❤️)
# - Emoji with skin tone modifier (👋🏽)
# - ZWJ sequences for compound emoji (👨‍👩‍👧, 👩‍💻)
# - Flag emoji (regional indicators 🇺🇸) - two consecutive regional indicator symbols

# Base emoji character ranges (excluding regional indicators which need special handling)
_EMOJI_BASE = (
    r"[\U0001F300-\U0001FAFF"  # Misc symbols, pictographs, emoticons
    r"\U00002700-\U000027BF"  # Dingbats
    r"\U0001F900-\U0001F9FF"  # Supplemental symbols
    r"\U0001F600-\U0001F64F"  # Emoticons
    r"\U0001F680-\U0001F6FF"  # Transport/map symbols
    r"\u2600-\u26FF"  # Misc symbols
    r"\u2700-\u27BF]"  # Dingbats
)
_EMOJI_MODIFIERS = r"[\uFE0F\U0001F3FB-\U0001F3FF]?"  # Variation selector, skin tones
_EMOJI_ZWJ_SEQ = rf"(?:\u200D{_EMOJI_BASE}{_EMOJI_MODIFIERS})*"  # ZWJ sequences
# Flag emoji: two consecutive regional indicator symbols (U+1F1E0 - U+1F1FF)
_FLAG_EMOJI = r"[\U0001F1E0-\U0001F1FF]{2}"
# Full pattern: either a flag emoji OR a regular emoji with modifiers/ZWJ
_EMOJI_PATTERN = rf"^({_FLAG_EMOJI}|{_EMOJI_BASE}{_EMOJI_MODIFIERS}{_EMOJI_ZWJ_SEQ})\s*"


def _strip_emoji_and_space(name):
    return re.sub(_EMOJI_PATTERN, "", name)


# =============================================================================
# API Response Caching
# =============================================================================
# TTL caches to reduce redundant API calls
# Keys are tuples or strings; values are API responses

# Cache TTL: 15 minutes (900 seconds) for all caches
# Caches are cleared on Sync Now or mutations
_CACHE_TTL = 900

# Cache recurring items
_recurring_cache: TTLCache = TTLCache(maxsize=10, ttl=_CACHE_TTL)

# Cache budget data
_budget_cache: TTLCache = TTLCache(maxsize=10, ttl=_CACHE_TTL)

# Cache category info
_category_cache: TTLCache = TTLCache(maxsize=10, ttl=_CACHE_TTL)

# Cache category groups
_category_groups_cache: TTLCache = TTLCache(maxsize=10, ttl=_CACHE_TTL)


def get_cache(cache_name: str) -> TTLCache:
    """Get a cache by name for external access."""
    caches: dict[str, TTLCache] = {
        "recurring": _recurring_cache,
        "budget": _budget_cache,
        "category": _category_cache,
        "category_groups": _category_groups_cache,
    }
    cache = caches.get(cache_name)
    if cache is None:
        raise KeyError(f"Unknown cache: {cache_name}")
    return cache


def clear_all_caches():
    """Clear all API caches. Call after mutations."""
    _recurring_cache.clear()
    _budget_cache.clear()
    _category_cache.clear()
    _category_groups_cache.clear()


def clear_cache(cache_name: str):
    """Clear a specific cache by name."""
    cache = get_cache(cache_name)
    if cache:
        cache.clear()


# =============================================================================
# Retry with Exponential Backoff
# =============================================================================


class RateLimitError(Exception):
    """Raised when API returns 429 Too Many Requests."""


async def retry_with_backoff(
    func,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    backoff_factor: float = 2.0,
):
    """
    Execute an async function with exponential backoff on failure.

    Args:
        func: Async callable to execute
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay in seconds
        max_delay: Maximum delay between retries
        backoff_factor: Multiplier for delay after each retry

    Returns:
        Result from successful function call

    Raises:
        Last exception if all retries fail
    """
    last_exception = None
    delay = base_delay

    for attempt in range(max_retries + 1):
        try:
            return await func()
        except Exception as e:
            last_exception = e
            rate_limited = is_rate_limit_error(e)

            if attempt < max_retries:
                if rate_limited:
                    # For rate limits, use longer delays
                    actual_delay = min(delay * 2, max_delay)
                    print(
                        f"Rate limited. Waiting {actual_delay:.1f}s before retry {attempt + 1}/{max_retries}..."
                    )
                else:
                    actual_delay = min(delay, max_delay)
                    print(
                        f"Request failed: {e}. Retrying in {actual_delay:.1f}s ({attempt + 1}/{max_retries})..."
                    )

                await asyncio.sleep(actual_delay)
                delay *= backoff_factor
            else:
                # Last attempt failed
                if rate_limited:
                    raise RateLimitError(f"Rate limited after {max_retries} retries: {e}")
                raise

    if last_exception is not None:
        raise last_exception
    raise RuntimeError("retry_with_backoff: No attempts made")


def _get_credentials():
    """Get credentials from session or environment variables."""
    # First try session credentials (set after unlock)
    from services.credentials_service import CredentialsService

    if CredentialsService._session_credentials:
        creds = CredentialsService._session_credentials
        return (
            creds.get("email"),
            creds.get("password"),
            creds.get("mfa_secret", ""),
        )

    # Fall back to environment variables
    return (
        os.environ.get("MONARCH_MONEY_EMAIL"),
        os.environ.get("MONARCH_MONEY_PASSWORD"),
        os.environ.get("MFA_SECRET_KEY", ""),
    )


def get_month_range() -> tuple[str, str]:
    now = datetime.now()
    start = now.replace(day=1).strftime("%Y-%m-%d")
    if now.month == 12:
        end_date = now.replace(year=now.year + 1, month=1, day=1)
    else:
        end_date = now.replace(month=now.month + 1, day=1)
    end = (end_date - timedelta(days=1)).strftime("%Y-%m-%d")
    return start, end


def _extract_secret_from_otpauth(uri: str) -> str | None:
    """
    Extract the secret from an otpauth:// URI.

    Format: otpauth://totp/Label?secret=JBSWY3DPEHPK3PXP&issuer=...

    Args:
        uri: The otpauth:// URI

    Returns:
        The extracted secret, or None if not found
    """
    from urllib.parse import parse_qs, urlparse

    try:
        parsed = urlparse(uri)
        if parsed.scheme.lower() != "otpauth":
            return None
        params = parse_qs(parsed.query)
        secrets = params.get("secret", [])
        if secrets:
            return secrets[0]
    except Exception:
        pass
    return None


def _sanitize_base32_secret(secret: str) -> str:
    """
    Sanitize a base32 secret key by fixing common transcription mistakes.

    Base32 only uses A-Z and 2-7. Common mistakes:
    - 0 (zero) → O (letter)
    - 1 (one) → I (letter) or L
    - 8 (eight) → B

    Also removes spaces and converts to uppercase.
    Also handles otpauth:// URIs by extracting the embedded secret.
    """
    if not secret:
        return secret

    # Check if it's an otpauth:// URI and extract the secret
    if secret.lower().startswith("otpauth://"):
        extracted = _extract_secret_from_otpauth(secret)
        if extracted:
            secret = extracted

    # Remove spaces and convert to uppercase
    secret = secret.replace(" ", "").upper()
    # Fix common mistakes
    secret = secret.replace("0", "O")  # zero → O
    secret = secret.replace("1", "I")  # one → I
    secret = secret.replace("8", "B")  # eight → B
    return secret


def _is_invalid_token_error(error: Exception) -> bool:
    """Check if an error indicates an invalid/expired session token."""
    error_str = str(error).lower()
    return (
        "invalid token" in error_str or "unauthorized" in error_str or "authentication" in error_str
    )


async def _validate_session(mm: MonarchMoney) -> bool:
    """
    Validate that the MonarchMoney session is actually working.

    The login() method with use_saved_session=True doesn't validate the token -
    it just loads it. We need to make an actual API call to verify.
    """
    try:
        # Use a lightweight call to verify the session is valid
        await mm.get_subscription_details()
        return True
    except Exception as e:
        # For invalid token errors, session is invalid
        # For other errors (network, rate limit, etc.), assume session is OK
        # to avoid unnecessary re-auth attempts
        return not _is_invalid_token_error(e)


async def get_mm(email=None, password=None, mfa_secret_key=None):
    """
    Get authenticated MonarchMoney client.

    Can use explicitly passed credentials, stored credentials, or env vars.
    If the saved session has an expired token, automatically clears it and retries.
    """
    # Use provided credentials or load from storage/env
    if email is None or password is None:
        stored_email, stored_password, stored_mfa = _get_credentials()
        email = email or stored_email
        password = password or stored_password
        mfa_secret_key = mfa_secret_key or stored_mfa

    # Sanitize MFA secret to fix common base32 transcription errors
    if mfa_secret_key:
        mfa_secret_key = _sanitize_base32_secret(mfa_secret_key)

    session_file = str(config.MONARCH_SESSION_FILE)
    use_saved_session = session_file and os.path.exists(session_file)

    # Use configured session file path (stored in STATE_DIR for desktop/docker compatibility)
    # Pass custom headers to avoid Cloudflare issues (525 errors)
    client_config = _get_monarch_client_config()
    mm = MonarchMoney(session_file=session_file, **client_config)

    # Try to use saved session first, but handle expired tokens gracefully
    if use_saved_session:
        print(f"Using saved session from {session_file}.")
        try:
            await mm.login(
                email=email,
                password=password,
                mfa_secret_key=mfa_secret_key,
                use_saved_session=True,
            )

            # Validate the session with a real API call - login() doesn't verify the token
            if await _validate_session(mm):
                return mm

            # Session is invalid - clear and re-authenticate
            print("Saved session token is invalid. Clearing and re-authenticating...")

        except Exception as e:
            if not _is_invalid_token_error(e):
                # Some other error during login - re-raise
                raise
            print(f"Session token expired during login ({e}). Clearing session...")

        # Delete the stale session file
        with contextlib.suppress(OSError):
            os.remove(session_file)

        # Create fresh client without stale session
        mm = MonarchMoney(session_file=session_file, **client_config)

    # Login fresh (either no saved session or it was cleared due to expiry)
    await mm.login(
        email=email,
        password=password,
        mfa_secret_key=mfa_secret_key,
        use_saved_session=False,
    )
    return mm


async def get_mm_with_code(email: str, password: str, mfa_code: str):
    """
    Authenticate with a one-time MFA code instead of the secret.

    This is used when users can't find their MFA secret key and prefer
    to enter the 6-digit code from their authenticator app each time.

    Args:
        email: Monarch Money email
        password: Monarch Money password
        mfa_code: 6-digit one-time code from authenticator app

    Returns:
        Authenticated MonarchMoney client
    """
    # Pass custom headers to avoid Cloudflare issues (525 errors)
    client_config = _get_monarch_client_config()
    mm = MonarchMoney(session_file=str(config.MONARCH_SESSION_FILE), **client_config)

    # First try login - this will fail with MFA error if MFA is enabled
    try:
        await mm.login(email=email, password=password)
    except Exception as e:
        error_lower = str(e).lower()
        if "mfa" in error_lower or "multi-factor" in error_lower or "2fa" in error_lower:
            # MFA required - authenticate with the one-time code
            await mm.multi_factor_authenticate(email, password, mfa_code)
            # multi_factor_authenticate() doesn't save the session automatically
            # (unlike login()), so we need to save it explicitly
            mm.save_session()
        else:
            # Some other error - re-raise
            raise

    return mm


# Cache for savings goals
_savings_goals_cache: TTLCache = TTLCache(maxsize=10, ttl=_CACHE_TTL)


async def get_savings_goals(mm, start_month: str, end_month: str) -> list[Any]:
    """
    Fetch savings goals monthly budget amounts from Monarch.

    This data is separate from goalsV2 and contains the "Save Up Goals"
    that appear in Monarch's budget summary.

    Args:
        mm: Authenticated MonarchMoney client
        start_month: Start month in YYYY-MM-DD format
        end_month: End month in YYYY-MM-DD format

    Returns:
        List of savings goal monthly budget amounts
    """
    cache_key = f"savings_goals_{start_month}_{end_month}"
    if cache_key in _savings_goals_cache:
        cached: list[Any] = _savings_goals_cache[cache_key]
        return cached

    # Use library method
    result = await mm.get_savings_goal_budgets(start_month, end_month)

    goals: list[Any] = result.get("savingsGoalMonthlyBudgetAmounts", [])
    _savings_goals_cache[cache_key] = goals
    return goals


# Cache for goal balances (from savingsGoals query)
_goal_balances_cache: TTLCache = TTLCache(maxsize=10, ttl=_CACHE_TTL)


async def get_goal_balances(mm) -> list[dict[str, Any]]:
    """
    Fetch Monarch savings goal balances using the library's get_savings_goals().

    This returns the actual goal balances (currentBalance), not the monthly
    contribution amounts. Used for the Available Funds calculation.

    Returns:
        List of dicts with 'id', 'name', 'balance' for each active goal
    """
    cache_key = "goal_balances"
    if cache_key in _goal_balances_cache:
        cached: list[dict[str, Any]] = _goal_balances_cache[cache_key]
        return cached

    # Use the library's get_savings_goals() which returns full goal data
    result = await mm.get_savings_goals()
    raw_goals = result.get("savingsGoals", [])

    # Extract just the balance info we need, filtering out archived/completed
    balances: list[dict[str, Any]] = []
    for goal in raw_goals:
        # Skip archived or completed goals
        if goal.get("archivedAt") or goal.get("completedAt"):
            continue

        balances.append(
            {
                "id": goal.get("id"),
                "name": goal.get("name"),
                "balance": goal.get("currentBalance", 0),
            }
        )

    _goal_balances_cache[cache_key] = balances
    return balances


# Cache for full goals data
_full_goals_cache: TTLCache = TTLCache(maxsize=10, ttl=_CACHE_TTL)


async def get_savings_goals_full(mm) -> list[dict[str, Any]]:
    """
    Fetch full Monarch savings goal data for display in Stash grid.

    Returns complete goal information including financial data, time-based
    forecasting, and display metadata. Used when rendering goals as cards
    alongside Stash items.

    Unlike get_goal_balances() which returns minimal data for calculations,
    this returns all fields needed for the goal card UI.

    Returns:
        List of dicts with complete goal data for each active (non-archived) goal
    """
    cache_key = "full_goals"
    if cache_key in _full_goals_cache:
        cached: list[dict[str, Any]] = _full_goals_cache[cache_key]
        return cached

    # Use the library's get_savings_goals() which returns full goal data
    result = await mm.get_savings_goals()
    raw_goals = result.get("savingsGoals", [])

    # Extract full goal info, filtering out archived (but keeping completed - they show in UI)
    goals: list[dict[str, Any]] = []
    for goal in raw_goals:
        # Skip archived goals (but include completed ones)
        if goal.get("archivedAt"):
            continue

        goals.append(
            {
                "id": goal.get("id"),
                "name": goal.get("name"),
                # Financial data
                "current_balance": goal.get("currentBalance", 0),
                "net_contribution": goal.get(
                    "netContribution", 0
                ),  # Total amount saved (for display)
                "target_amount": goal.get("targetAmount"),  # Can be None
                "target_date": goal.get("targetDate"),  # Can be None
                "progress": goal.get("progress", 0),
                # Time-based forecasting
                "estimated_months_until_completion": goal.get("estimatedMonthsUntilCompletion"),
                "forecasted_completion_date": goal.get("forecastedCompletionDate"),
                "planned_monthly_contribution": goal.get("plannedMonthlyContribution", 0),
                # Status from Monarch API (can be null, "ahead", "on_track", "at_risk", "completed")
                "status": goal.get("status"),
                # State flags
                # Goal is completed if EITHER completedAt is set OR status is "completed"
                # (status="completed" means balance >= target, even if user hasn't manually marked it)
                "is_completed": bool(goal.get("completedAt")) or goal.get("status") == "completed",
                # Image data
                "image_storage_provider": goal.get("imageStorageProvider"),
                "image_storage_provider_id": goal.get("imageStorageProviderId"),
            }
        )

    _full_goals_cache[cache_key] = goals
    return goals


# Cache for user profile
_user_profile_cache: TTLCache = TTLCache(maxsize=1, ttl=_CACHE_TTL)


async def get_user_profile(mm) -> dict[str, Any]:
    """
    Fetch user profile from Monarch.

    Returns:
        dict with user profile data including 'name', 'email', 'id'
    """
    cache_key = "user_profile"
    if cache_key in _user_profile_cache:
        cached: dict[str, Any] = _user_profile_cache[cache_key]
        return cached

    # Use library method
    result = await mm.get_user_profile()

    profile: dict[str, Any] = result.get("me", {})
    _user_profile_cache[cache_key] = profile
    return profile


def get_user_first_name(profile: dict[str, Any]) -> str:
    """Extract first name from user profile."""
    name = profile.get("name", "")
    if name:
        # Split on spaces and take the first part
        return str(name).split()[0]
    return ""


# Cache for aggregate data (spending totals)
_aggregates_cache: TTLCache = TTLCache(maxsize=100, ttl=_CACHE_TTL)


async def get_category_aggregates(
    mm, category_id: str, start_date: str, end_date: str
) -> dict[str, Any]:
    """
    Get aggregate spending data for a category over a date range.

    Uses Monarch's GetAggregates query to fetch total income and expenses
    for a specific category. This is useful for calculating "total ever budgeted"
    for one-time purchase goals.

    Args:
        mm: Authenticated MonarchMoney client
        category_id: The category ID to get aggregates for
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format

    Returns:
        dict with 'sumExpense' and 'sumIncome' (both are floats, expense is negative)
    """
    cache_key = f"aggregates_{category_id}_{start_date}_{end_date}"
    if cache_key in _aggregates_cache:
        cached: dict[str, Any] = _aggregates_cache[cache_key]
        return cached

    # Use library method
    result = await mm.get_aggregates(
        start_date=start_date,
        end_date=end_date,
        category_ids=[category_id],
    )

    # Handle both list and dict responses from the API
    aggregates_data = result.get("aggregates", {})
    if isinstance(aggregates_data, list):
        # If it's a list, get the first item's summary
        summary = aggregates_data[0].get("summary", {}) if aggregates_data else {}
    else:
        summary = aggregates_data.get("summary", {})

    aggregates: dict[str, Any] = {
        "sumExpense": summary.get("sumExpense", 0.0),
        "sumIncome": summary.get("sumIncome", 0.0),
    }
    _aggregates_cache[cache_key] = aggregates
    return aggregates


async def get_category_transactions(
    mm: MonarchMoney,
    category_id: str,
    start_date: str,
    end_date: str,
) -> list[dict[str, Any]]:
    """
    Get transactions for a category within a date range.

    Args:
        mm: MonarchMoney client instance
        category_id: Category ID to get transactions for
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)

    Returns:
        List of transaction dicts with 'amount', 'date', etc.
    """
    # Use library method with category_ids filter
    result = await mm.get_transactions(
        limit=1000,
        start_date=start_date,
        end_date=end_date,
        category_ids=[category_id],
    )

    transactions: list[dict[str, Any]] = result.get("allTransactions", {}).get("results", [])
    return transactions


# Helper to build category id<->name maps and monthly lookup
def build_category_maps(budgets):
    cat_id_to_name_categories = {}
    cat_id_to_name_groups = {}
    cat_name_to_id_categories = {}
    cat_name_to_id_groups = {}

    for group in budgets.get("categoryGroups", []):
        group_id = group["id"]
        group_name = _strip_emoji_and_space(group["name"])
        cat_id_to_name_groups[group_id] = group_name
        cat_name_to_id_groups[group_name.lower()] = group_id
        for cat in group.get("categories", []):
            cat_id = cat["id"]
            cat_name = cat["name"]
            cat_id_to_name_categories[cat_id] = cat_name
            cat_name_to_id_categories[cat_name.lower()] = cat_id

    monthly_categories = budgets["budgetData"].get("monthlyAmountsByCategory", [])
    monthly_categories_lookup = {
        (entry["category"]["id"], m["month"]): m
        for entry in monthly_categories
        for m in entry["monthlyAmounts"]
    }
    monthly_category_groups = budgets["budgetData"].get("monthlyAmountsByCategoryGroup", [])
    monthly_category_groups_lookup = {
        (entry["categoryGroup"]["id"], m["month"]): m
        for entry in monthly_category_groups
        for m in entry["monthlyAmounts"]
    }

    return (
        {
            "categories": cat_id_to_name_categories,
            "categoryGroups": cat_id_to_name_groups,
        },
        {
            "categories": cat_name_to_id_categories,
            "categoryGroups": cat_name_to_id_groups,
        },
        {
            "categories": monthly_categories_lookup,
            "categoryGroups": monthly_category_groups_lookup,
        },
    )


async def update_category_rollover_balance(
    category_id: str,
    amount_to_add: int,
) -> dict[str, Any]:
    """
    Add funds to a category's rollover starting balance.

    This is used by the Distribute wizard to allocate "available to stash"
    funds that exceed "left to budget". The excess goes into the category's
    rollover starting balance, effectively adding savings to that category.

    If the category doesn't have rollover enabled, this will enable it with
    monthly rollover type and set the starting month to the current month.

    Args:
        category_id: The Monarch category ID to update
        amount_to_add: Amount (in dollars) to add to the starting balance

    Returns:
        dict with the updated category data
    """
    mm = await get_mm()

    # First, get the current category to check existing rollover settings
    # Use library method
    current = await mm.get_category_rollover(category_id)

    category_data = current.get("category", {})
    rollover_period = category_data.get("rolloverPeriod")

    # Calculate new starting balance
    current_balance = 0
    if rollover_period:
        current_balance = rollover_period.get("startingBalance", 0) or 0

    new_balance = current_balance + amount_to_add

    # Use current month as start month if enabling rollover for first time
    current_month = datetime.now().replace(day=1)

    if not rollover_period:
        # Enable rollover for the first time using library method
        result = await retry_with_backoff(
            lambda: mm.enable_category_rollover(
                category_id=category_id,
                rollover_start_month=current_month,
                rollover_starting_balance=new_balance,
                rollover_frequency="monthly",
            )
        )
    else:
        # Update existing rollover using library method
        result = await retry_with_backoff(
            lambda: mm.update_category_rollover(
                category_id=category_id,
                starting_balance=new_balance,
            )
        )

    # Clear caches after mutation
    clear_cache("category")
    clear_cache("budget")

    result_dict: dict[str, Any] = result if isinstance(result, dict) else {}
    return result_dict
