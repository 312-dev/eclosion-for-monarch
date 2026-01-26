"""
Tracker state models.

These store the recurring expense tracking configuration and state.
No encryption needed - contains only IDs, amounts, and preferences.
"""

from datetime import UTC, date, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class TrackerConfig(Base):
    """
    Global tracker configuration.

    Single row table containing app-wide settings.
    """

    __tablename__ = "tracker_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    schema_version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0")
    target_group_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target_group_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    auto_sync_new: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_track_threshold: Mapped[float | None] = mapped_column(Float, nullable=True)
    auto_update_targets: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_categorize_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    last_auto_categorize_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    show_category_group: Mapped[bool] = mapped_column(Boolean, default=True)
    last_sync: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_read_changelog_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mfa_mode: Mapped[str] = mapped_column(String(20), default="secret")
    sync_blocked_reason: Mapped[str | None] = mapped_column(String(100), nullable=True)

    __table_args__ = (CheckConstraint("id = 1", name="single_row_config"),)


class Category(Base):
    """
    Tracked category state.

    Maps a Monarch recurring item to a tracking category.
    """

    __tablename__ = "categories"

    recurring_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    monarch_category_id: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    emoji: Mapped[str] = mapped_column(String(10), default="🔄")
    target_amount: Mapped[float] = mapped_column(Float, nullable=False)
    over_contribution: Mapped[float] = mapped_column(Float, default=0.0)
    previous_due_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_linked: Mapped[bool] = mapped_column(Boolean, default=False)
    sync_name: Mapped[bool] = mapped_column(Boolean, default=True)
    frozen_monthly_target: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_month: Mapped[str | None] = mapped_column(String(10), nullable=True)  # "2025-01"
    balance_at_month_start: Mapped[float | None] = mapped_column(Float, nullable=True)
    frozen_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    frozen_frequency_months: Mapped[float | None] = mapped_column(Float, nullable=True)
    # New fields for improved frozen target calculation (v3)
    frozen_rollover_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    frozen_next_due_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class EnabledItem(Base):
    """
    Tracks which recurring items are enabled for tracking.

    Simple set of recurring_id values.
    """

    __tablename__ = "enabled_items"

    recurring_id: Mapped[str] = mapped_column(String(100), primary_key=True)


class Rollup(Base):
    """
    Rollup category configuration.

    Single row table for the rollup feature settings.
    """

    __tablename__ = "rollup"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    monarch_category_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    category_name: Mapped[str] = mapped_column(String(255), default="Recurring Rollup")
    emoji: Mapped[str] = mapped_column(String(10), default="🔄")
    total_budgeted: Mapped[float] = mapped_column(Float, default=0.0)
    is_linked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationship to rollup items
    items: Mapped[list["RollupItem"]] = relationship(
        "RollupItem", back_populates="rollup", cascade="all, delete-orphan"
    )

    __table_args__ = (CheckConstraint("id = 1", name="single_row_rollup"),)


class RollupItem(Base):
    """
    Items included in the rollup category.
    """

    __tablename__ = "rollup_items"

    recurring_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    rollup_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rollup.id", ondelete="CASCADE"), default=1
    )

    rollup: Mapped["Rollup"] = relationship("Rollup", back_populates="items")


class RemovedItemNotice(Base):
    """
    Notices for recurring items that were removed from Monarch.

    Allows users to be notified and take action on orphaned categories.
    """

    __tablename__ = "removed_item_notices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    recurring_id: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category_name: Mapped[str] = mapped_column(String(255), nullable=False)
    was_rollup: Mapped[bool] = mapped_column(Boolean, nullable=False)
    removed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    dismissed: Mapped[bool] = mapped_column(Boolean, default=False)


class AutoSyncState(Base):
    """
    Background auto-sync configuration and state.

    Single row table tracking sync preferences and last sync status.
    """

    __tablename__ = "auto_sync_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    interval_minutes: Mapped[int] = mapped_column(Integer, default=360)  # 6 hours
    last_auto_sync: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_auto_sync_success: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    last_auto_sync_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    consent_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_timestamp: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (CheckConstraint("id = 1", name="single_row_auto_sync"),)


class WishlistItem(Base):
    """
    Wishlist savings goal item.

    Tracks a one-time purchase goal linked to a Monarch category.
    Users save towards a target amount by a specified date.
    """

    __tablename__ = "wishlist_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)  # Target amount
    target_date: Mapped[str] = mapped_column(String(20), nullable=False)  # YYYY-MM-DD
    emoji: Mapped[str] = mapped_column(String(10), default="🎯")

    # Monarch integration
    monarch_category_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    category_group_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    category_group_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Source tracking (from bookmark sync)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_bookmark_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Custom image (user-uploaded or Openverse URL)
    custom_image_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Attribution text for Openverse images
    image_attribution: Mapped[str | None] = mapped_column(Text, nullable=True)

    # State tracking
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Grid layout (for widget-style resizable cards)
    grid_x: Mapped[int] = mapped_column(Integer, default=0)
    grid_y: Mapped[int] = mapped_column(Integer, default=0)
    col_span: Mapped[int] = mapped_column(Integer, default=1)
    row_span: Mapped[int] = mapped_column(Integer, default=1)
    # Sequential sort order for drag-to-reorder (0-indexed, lower = earlier)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    # Goal type determines how progress is calculated
    # - 'one_time': Save up to buy something, mark complete when done.
    #               Progress = total ever budgeted (immune to spending).
    # - 'savings_buffer': Ongoing fund that can be spent and refilled.
    #                     Progress = current remaining balance.
    goal_type: Mapped[str] = mapped_column(String(20), default="one_time")

    # When the one-time purchase was marked as completed (archived)
    # Null = not completed, timestamp = completed
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Custom start date for tracking progress (one_time goals only)
    # Used as startDate filter in Monarch aggregate query
    # Null = use 1st of created_at month
    tracking_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)


class WishlistConfig(Base):
    """
    Wishlist feature configuration.

    Single row table containing wishlist settings including browser sync
    preferences and auto-archive behavior.
    """

    __tablename__ = "wishlist_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)

    # Default category group for new wishlist items
    default_category_group_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    default_category_group_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Bookmark sync settings
    selected_browser: Mapped[str | None] = mapped_column(String(20), nullable=True)
    selected_folder_ids: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array
    selected_folder_names: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array

    # Auto-archive settings
    auto_archive_on_bookmark_delete: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_archive_on_goal_met: Mapped[bool] = mapped_column(Boolean, default=True)

    # Available to Stash calculation settings
    include_expected_income: Mapped[bool] = mapped_column(Boolean, default=True)
    selected_cash_account_ids: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array
    buffer_amount: Mapped[int] = mapped_column(
        Integer, default=0
    )  # Reserved buffer for Available to Stash

    # Display settings
    show_monarch_goals: Mapped[bool] = mapped_column(Boolean, default=True)

    # Configuration state
    is_configured: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (CheckConstraint("id = 1", name="single_row_wishlist_config"),)


class PendingBookmark(Base):
    """
    Pending bookmark for review workflow.

    Bookmarks imported from browser sync land here first.
    User can either skip (remembered by URL) or convert to wishlist item.
    URL-based deduplication prevents duplicate entries.
    """

    __tablename__ = "pending_bookmarks"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    url: Mapped[str] = mapped_column(String(2048), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    bookmark_id: Mapped[str] = mapped_column(String(100), nullable=False)
    browser_type: Mapped[str] = mapped_column(String(20), nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    # Status: 'pending' (needs review), 'skipped' (user skipped), 'converted' (became wishlist item)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)

    # Link to wishlist item if converted
    wishlist_item_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False
    )
    skipped_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    converted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class MonarchGoalLayout(Base):
    """
    Grid layout positions for Monarch savings goals displayed in Stash view.

    Stores user-customized grid positions (x, y, column span, row span) for
    Monarch goals when the "Show Monarch goals" setting is enabled.
    """

    __tablename__ = "monarch_goal_layout"

    goal_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    grid_x: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    grid_y: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    col_span: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    row_span: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # Sequential sort order for drag-to-reorder (0-indexed, lower = earlier)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class StashHypothesis(Base):
    """
    Saved hypothesis for what-if planning in the Distribute Wizard.

    Stores both savings and monthly allocation configurations along with
    hypothetical events. Users can save up to 10 hypotheses.
    """

    __tablename__ = "stash_hypotheses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Screen 1: Savings allocations (JSON: Record<stashId, amount>)
    savings_allocations: Mapped[str] = mapped_column(Text, default="{}")
    savings_total: Mapped[float] = mapped_column(Float, default=0.0)

    # Screen 2: Monthly allocations (JSON: Record<stashId, amount>)
    monthly_allocations: Mapped[str] = mapped_column(Text, default="{}")
    monthly_total: Mapped[float] = mapped_column(Float, default=0.0)

    # Hypothetical events (JSON: StashEventsMap)
    events: Mapped[str] = mapped_column(Text, default="{}")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
