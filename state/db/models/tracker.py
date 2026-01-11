"""
Tracker state models.

These store the recurring expense tracking configuration and state.
No encryption needed - contains only IDs, amounts, and preferences.
"""

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Text
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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
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
