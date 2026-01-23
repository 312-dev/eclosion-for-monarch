"""Add Monarch goal layout and Stash config settings.

Creates monarch_goal_layout table for storing grid positions of Monarch goals.
Adds show_monarch_goals and include_expected_income flags to wishlist_config.

Revision ID: 010
Revises: 009
Create Date: 2026-01-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "010"
down_revision: str | None = "009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create monarch_goal_layout table
    op.create_table(
        "monarch_goal_layout",
        sa.Column("goal_id", sa.String(100), nullable=False),
        sa.Column("grid_x", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("grid_y", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("col_span", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("row_span", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("goal_id"),
    )

    # Add include_expected_income to wishlist_config
    # Controls whether planned income is included in Available to Stash calculation
    op.add_column(
        "wishlist_config",
        sa.Column("include_expected_income", sa.Boolean(), nullable=False, server_default="0"),
    )

    # Add show_monarch_goals to wishlist_config
    # Controls whether Monarch savings goals are displayed in Stash grid
    op.add_column(
        "wishlist_config",
        sa.Column("show_monarch_goals", sa.Boolean(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    # Remove columns from wishlist_config
    op.drop_column("wishlist_config", "show_monarch_goals")
    op.drop_column("wishlist_config", "include_expected_income")

    # Drop monarch_goal_layout table
    op.drop_table("monarch_goal_layout")
