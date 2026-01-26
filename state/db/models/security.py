"""
Security event models.

Audit trail for authentication and security-related events.
"""

from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class SecurityEvent(Base):
    """
    Security event audit log.

    Tracks login attempts, unlocks, and other security-relevant actions.
    """

    __tablename__ = "security_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv6 max length
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("idx_security_timestamp", "timestamp"),
        Index("idx_security_type", "event_type"),
        Index("idx_security_success", "success"),
    )


class GeolocationCache(Base):
    """
    Cache for IP geolocation lookups.

    Reduces external API calls for repeated IP addresses.
    """

    __tablename__ = "ip_geolocation_cache"

    ip_address: Mapped[str] = mapped_column(String(45), primary_key=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cached_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))


class SecurityPreference(Base):
    """
    Key-value store for security preferences.
    """

    __tablename__ = "security_preferences"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
