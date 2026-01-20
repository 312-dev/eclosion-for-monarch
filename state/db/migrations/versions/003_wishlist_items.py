"""Add wishlist_items table.

Revision ID: 003
Revises: 002
Create Date: 2025-01-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "wishlist_items",
        sa.Column("id", sa.String(36), primary_key=True),  # UUID
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),  # Target amount
        sa.Column("target_date", sa.String(20), nullable=False),  # YYYY-MM-DD
        sa.Column("emoji", sa.String(10), default="🎯"),
        # Monarch integration
        sa.Column("monarch_category_id", sa.String(100), nullable=True),
        sa.Column("category_group_id", sa.String(100), nullable=True),
        sa.Column("category_group_name", sa.String(255), nullable=True),
        # Source tracking (from bookmark sync)
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("source_bookmark_id", sa.String(100), nullable=True),
        sa.Column("logo_url", sa.Text(), nullable=True),
        # State tracking
        sa.Column("is_archived", sa.Boolean(), default=False),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("wishlist_items")
