"""Update stash config defaults and add buffer amount.

Changes default values for include_expected_income and show_monarch_goals to True.
Adds buffer_amount column for the buffer slider feature.
Updates existing rows to use new defaults.

Revision ID: 012
Revises: 011
Create Date: 2026-01-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "012"
down_revision: str | None = "011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add buffer_amount column to wishlist_config
    # Stores the user's reserved buffer amount for Available to Stash calculation
    op.add_column(
        "wishlist_config",
        sa.Column("buffer_amount", sa.Integer(), nullable=False, server_default="0"),
    )

    # Update existing rows to use new defaults for the settings
    # (include_expected_income and show_monarch_goals default to True now)
    op.execute(
        "UPDATE wishlist_config SET include_expected_income = 1, show_monarch_goals = 1"
    )

    # Note: SQLite doesn't support ALTER COLUMN to change defaults, but the model
    # defaults in tracker.py will apply for new rows. The server_default in the
    # original migration (010) remains as "0" in the schema, but Python-side
    # defaults will be True for new insertions.


def downgrade() -> None:
    # Remove buffer_amount column
    op.drop_column("wishlist_config", "buffer_amount")

    # Revert settings to old defaults
    op.execute(
        "UPDATE wishlist_config SET include_expected_income = 0, show_monarch_goals = 0"
    )
