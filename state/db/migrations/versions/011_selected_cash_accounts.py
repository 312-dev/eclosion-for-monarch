"""Add selected_cash_account_ids to wishlist_config.

Adds selected_cash_account_ids field to control which cash accounts are included
in the Available to Stash calculation. Null means all accounts (default).

Revision ID: 011
Revises: 010
Create Date: 2026-01-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "011"
down_revision: str | None = "010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add selected_cash_account_ids to wishlist_config
    # Stores JSON array of account IDs. Null = all accounts included (default)
    op.add_column(
        "wishlist_config",
        sa.Column("selected_cash_account_ids", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    # Remove column from wishlist_config
    op.drop_column("wishlist_config", "selected_cash_account_ids")
