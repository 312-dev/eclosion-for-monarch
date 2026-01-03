import asyncio
import os
import re
from datetime import datetime, timedelta

from cachetools import TTLCache
from dotenv import load_dotenv
from gql import gql
from monarchmoney import MonarchMoney

from core.error_detection import is_rate_limit_error

load_dotenv()


# Helper to strip leading emoji and space from a string
def _strip_emoji_and_space(name):
    return re.sub(
        r"^([\U0001F300-\U0001FAFF\U00002700-\U000027BF\U0001F900-\U0001F9FF\U0001F600-\U0001F64F\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\u2600-\u26FF\u2700-\u27BF]|[\u200d\u2640-\u2642\u2695-\u2696\u2708-\u2709\u231a-\u231b\u23e9-\u23ef\u23f0-\u23f3\u25fd-\u25fe\u2614-\u2615\u2744-\u2747\u2753-\u2755\u2795-\u2797\u27b0\u27bf\u2b05-\u2b07\u2934-\u2935\u2b1b-\u2b1c\u2b50\u2b55\u3030\u303d\u3297\u3299])+\s*",
        "",
        name,
    )


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
    caches = {
        "recurring": _recurring_cache,
        "budget": _budget_cache,
        "category": _category_cache,
        "category_groups": _category_groups_cache,
    }
    return caches.get(cache_name)


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

    pass


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

    raise last_exception


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


def get_month_range():
    now = datetime.now()
    start = now.replace(day=1).strftime("%Y-%m-%d")
    if now.month == 12:
        end = now.replace(year=now.year + 1, month=1, day=1)
    else:
        end = now.replace(month=now.month + 1, day=1)
    end = (end - timedelta(days=1)).strftime("%Y-%m-%d")
    return start, end


def _sanitize_base32_secret(secret: str) -> str:
    """
    Sanitize a base32 secret key by fixing common transcription mistakes.

    Base32 only uses A-Z and 2-7. Common mistakes:
    - 0 (zero) → O (letter)
    - 1 (one) → I (letter) or L
    - 8 (eight) → B

    Also removes spaces and converts to uppercase.
    """
    if not secret:
        return secret
    # Remove spaces and convert to uppercase
    secret = secret.replace(" ", "").upper()
    # Fix common mistakes
    secret = secret.replace("0", "O")  # zero → O
    secret = secret.replace("1", "I")  # one → I
    secret = secret.replace("8", "B")  # eight → B
    return secret


async def get_mm(email=None, password=None, mfa_secret_key=None):
    """
    Get authenticated MonarchMoney client.

    Can use explicitly passed credentials, stored credentials, or env vars.
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

    mm = MonarchMoney()

    # Use browser-like user agent (per Monarch support guidance for firewall issues)
    mm._headers["User-Agent"] = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    )
    session_file = getattr(mm, "_session_file", None)
    use_saved_session = False
    if session_file and os.path.exists(session_file):
        mtime = datetime.fromtimestamp(os.path.getmtime(session_file))
        if (datetime.now() - mtime).total_seconds() < 300:
            print(f"Using saved session from {session_file}.")
            use_saved_session = True
        else:
            print(f"Session file {session_file} is too old, removing.")
            os.remove(session_file)
    await mm.login(
        email=email,
        password=password,
        mfa_secret_key=mfa_secret_key,
        use_saved_session=use_saved_session,
    )
    return mm


# Cache for savings goals
_savings_goals_cache: TTLCache = TTLCache(maxsize=10, ttl=_CACHE_TTL)


async def get_savings_goals(mm, start_month: str, end_month: str) -> list:
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
        return _savings_goals_cache[cache_key]

    query = gql("""
        query GetSavingsGoals($startDate: Date!, $endDate: Date!) {
            savingsGoalMonthlyBudgetAmounts(startMonth: $startDate, endMonth: $endDate) {
                id
                savingsGoal {
                    id
                    name
                    type
                    status
                    archivedAt
                    completedAt
                }
                monthlyAmounts {
                    month
                    plannedAmount
                    actualAmount
                    remainingAmount
                }
            }
        }
    """)

    result = await mm.gql_call(
        operation="GetSavingsGoals",
        graphql_query=query,
        variables={"startDate": start_month, "endDate": end_month},
    )

    goals = result.get("savingsGoalMonthlyBudgetAmounts", [])
    _savings_goals_cache[cache_key] = goals
    return goals


# Cache for user profile
_user_profile_cache: TTLCache = TTLCache(maxsize=1, ttl=_CACHE_TTL)


async def get_user_profile(mm) -> dict:
    """
    Fetch user profile from Monarch.

    Returns:
        dict with user profile data including 'name', 'email', 'id'
    """
    cache_key = "user_profile"
    if cache_key in _user_profile_cache:
        return _user_profile_cache[cache_key]

    query = gql("""
        query Common_GetMe {
            me {
                id
                name
                email
            }
        }
    """)

    result = await mm.gql_call(
        operation="Common_GetMe",
        graphql_query=query,
    )

    profile = result.get("me", {})
    _user_profile_cache[cache_key] = profile
    return profile


def get_user_first_name(profile: dict) -> str:
    """Extract first name from user profile."""
    name = profile.get("name", "")
    if name:
        # Split on spaces and take the first part
        return name.split()[0]
    return ""


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
