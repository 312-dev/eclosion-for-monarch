"""Add wishlist_config table and custom_image_path to wishlist_items.

Revision ID: 004
Revises: 003
Create Date: 2025-01-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: str | None = "003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create wishlist_config table (single-row pattern)
    op.create_table(
        "wishlist_config",
        sa.Column("id", sa.Integer(), primary_key=True, default=1),
        # Default category group for new wishlist items
        sa.Column("default_category_group_id", sa.String(100), nullable=True),
        sa.Column("default_category_group_name", sa.String(255), nullable=True),
        # Bookmark sync settings
        sa.Column("selected_browser", sa.String(20), nullable=True),  # chrome/edge/brave/safari
        sa.Column("selected_folder_ids", sa.Text(), nullable=True),  # JSON array
        # Auto-archive settings
        sa.Column("auto_archive_on_bookmark_delete", sa.Boolean(), default=True),
        sa.Column("auto_archive_on_goal_met", sa.Boolean(), default=True),
        # Configuration state
        sa.Column("is_configured", sa.Boolean(), default=False),
        # Single row constraint
        sa.CheckConstraint("id = 1", name="single_row_wishlist_config"),
    )

    # Add custom_image_path to wishlist_items for user-uploaded images
    op.add_column(
        "wishlist_items",
        sa.Column("custom_image_path", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("wishlist_items", "custom_image_path")
    op.drop_table("wishlist_config")
