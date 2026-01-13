"""
Category Operations

Centralized category creation and management utilities.
Eliminates duplicated emoji/name formatting and category creation patterns.
"""

import re
from dataclasses import dataclass
from typing import Any, Protocol

# Default emoji for new categories
DEFAULT_EMOJI = "🔄"

# Pattern to match emoji at the start of a category name
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
EMOJI_PATTERN = re.compile(rf"^({_FLAG_EMOJI}|{_EMOJI_BASE}{_EMOJI_MODIFIERS}{_EMOJI_ZWJ_SEQ})\s*")


class CategoryManagerProtocol(Protocol):
    """Protocol for category manager dependency injection."""

    async def create_category(self, group_id: str, name: str) -> str: ...
    async def rename_category(self, category_id: str, new_name: str) -> None: ...


@dataclass
class CategoryNameParts:
    """Parsed parts of a category name."""

    emoji: str
    base_name: str
    full_name: str


def format_category_name(name: str, emoji: str = DEFAULT_EMOJI) -> str:
    """
    Format a category name with emoji prefix.

    Args:
        name: The base category name
        emoji: The emoji to prefix (defaults to 🔄)

    Returns:
        Formatted name like "🔄 Category Name"
    """
    return f"{emoji} {name}"


def parse_category_name(full_name: str) -> CategoryNameParts:
    """
    Parse a category name to extract emoji and base name.

    Args:
        full_name: Full category name possibly with emoji prefix

    Returns:
        CategoryNameParts with emoji, base_name, and full_name
    """
    match = EMOJI_PATTERN.match(full_name)
    if match:
        emoji = match.group(1)
        base_name = full_name[match.end() :].strip()
        return CategoryNameParts(
            emoji=emoji,
            base_name=base_name,
            full_name=full_name,
        )

    # No emoji found - use default
    return CategoryNameParts(
        emoji=DEFAULT_EMOJI,
        base_name=full_name.strip(),
        full_name=full_name,
    )


def get_emoji_from_state_or_default(cat_state: Any | None, default: str = DEFAULT_EMOJI) -> str:
    """
    Get emoji from category state, falling back to default.

    Args:
        cat_state: Category state object (may have .emoji attribute)
        default: Default emoji if state is None or has no emoji

    Returns:
        Emoji string
    """
    if cat_state is None:
        return default
    return getattr(cat_state, "emoji", None) or default


async def create_tracked_category(
    *,
    category_manager: CategoryManagerProtocol,
    group_id: str,
    name: str,
    emoji: str = DEFAULT_EMOJI,
) -> str:
    """
    Create a new tracked category with emoji prefix.

    This is the standard way to create categories in the tracker.

    Args:
        category_manager: Category manager for API calls
        group_id: Target category group ID
        name: Base category name (without emoji)
        emoji: Emoji to prefix (defaults to 🔄)

    Returns:
        New category ID
    """
    category_name = format_category_name(name, emoji)
    return await category_manager.create_category(
        group_id=group_id,
        name=category_name,
    )


async def ensure_category_exists(
    *,
    category_manager: CategoryManagerProtocol,
    group_id: str,
    name: str,
    emoji: str = DEFAULT_EMOJI,
    existing_category_id: str | None = None,
    category_exists: bool = True,
) -> tuple[str, bool]:
    """
    Ensure a category exists, creating if necessary.

    Args:
        category_manager: Category manager for API calls
        group_id: Target category group ID
        name: Base category name (without emoji)
        emoji: Emoji to prefix
        existing_category_id: ID of existing category (if any)
        category_exists: Whether the existing category still exists in Monarch

    Returns:
        Tuple of (category_id, was_created)
    """
    if existing_category_id and category_exists:
        return existing_category_id, False

    # Category doesn't exist or was deleted - create it
    new_id = await create_tracked_category(
        category_manager=category_manager,
        group_id=group_id,
        name=name,
        emoji=emoji,
    )
    return new_id, True


async def update_category_name_if_changed(
    *,
    category_manager: CategoryManagerProtocol,
    category_id: str,
    current_name: str,
    new_base_name: str,
    emoji: str,
    sync_name: bool = True,
) -> str | None:
    """
    Update category name if it has changed.

    Args:
        category_manager: Category manager for API calls
        category_id: Category ID to update
        current_name: Current full category name
        new_base_name: New base name (without emoji)
        emoji: Emoji to use
        sync_name: Whether name syncing is enabled

    Returns:
        New full name if updated, None if unchanged
    """
    if not sync_name:
        return None

    expected_name = format_category_name(new_base_name, emoji)
    if current_name != expected_name:
        await category_manager.rename_category(category_id, expected_name)
        return expected_name

    return None


def extract_emoji_from_category(category_info: dict[str, Any] | None) -> str:
    """
    Extract emoji from category info dict.

    Args:
        category_info: Category info dict with 'name' key

    Returns:
        Extracted emoji or default
    """
    if not category_info:
        return DEFAULT_EMOJI

    name = category_info.get("name", "")
    parsed = parse_category_name(name)
    return parsed.emoji
