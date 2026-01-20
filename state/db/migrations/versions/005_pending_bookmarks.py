"""Add pending_bookmarks table for bookmark review workflow.

Revision ID: 005
Revises: 004
Create Date: 2025-01-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: str | None = "004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create pending_bookmarks table for review workflow
    # Bookmarks are imported here first, then user reviews and either
    # skips (remembered by URL) or converts to wishlist item
    op.create_table(
        "pending_bookmarks",
        sa.Column("id", sa.String(100), primary_key=True),
        # URL is unique for deduplication - same URL won't create duplicates
        sa.Column("url", sa.String(2048), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("bookmark_id", sa.String(100), nullable=False),
        sa.Column("browser_type", sa.String(20), nullable=False),  # chrome/edge/brave/safari
        sa.Column("logo_url", sa.String(2048), nullable=True),  # Favicon URL
        # Status: 'pending' (needs review), 'skipped' (user skipped), 'converted' (became wishlist item)
        sa.Column("status", sa.String(20), nullable=False, default="pending"),
        # Link to wishlist item if converted
        sa.Column("wishlist_item_id", sa.String(100), nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("skipped_at", sa.DateTime(), nullable=True),
        sa.Column("converted_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("pending_bookmarks")
