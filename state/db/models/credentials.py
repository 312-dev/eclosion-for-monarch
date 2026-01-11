"""
Credentials models with column-level encryption.

User credentials are encrypted with the user's passphrase (PBKDF2 + Fernet).
Automation credentials are encrypted with a server-derived key.
"""

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Credentials(Base):
    """
    User credentials for Monarch Money API.

    Encrypted with user's passphrase - server cannot decrypt without it.
    Single row table (id=1 enforced by constraint).
    """

    __tablename__ = "credentials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    salt: Mapped[str] = mapped_column(Text, nullable=False)  # Base64 for PBKDF2
    email_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    password_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    mfa_secret_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    __table_args__ = (CheckConstraint("id = 1", name="single_row_credentials"),)


class AutomationCredentials(Base):
    """
    Credentials for background/automated sync.

    Encrypted with server-derived key - can auto-decrypt for background tasks.
    Requires explicit user consent to enable.
    """

    __tablename__ = "automation_credentials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    salt: Mapped[str] = mapped_column(Text, nullable=False)
    email_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    password_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    mfa_secret_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    consent_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_timestamp: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    __table_args__ = (CheckConstraint("id = 1", name="single_row_automation"),)
