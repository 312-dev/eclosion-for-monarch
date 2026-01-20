"""Add grid layout columns to wishlist_items.

Revision ID: 007
Revises: 006
Create Date: 2025-01-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "007"
down_revision: str | None = "006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add grid layout columns for widget-style resizable cards
    op.add_column(
        "wishlist_items",
        sa.Column("grid_x", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "wishlist_items",
        sa.Column("grid_y", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "wishlist_items",
        sa.Column("col_span", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "wishlist_items",
        sa.Column("row_span", sa.Integer(), nullable=False, server_default="1"),
    )


def downgrade() -> None:
    op.drop_column("wishlist_items", "grid_x")
    op.drop_column("wishlist_items", "grid_y")
    op.drop_column("wishlist_items", "col_span")
    op.drop_column("wishlist_items", "row_span")
