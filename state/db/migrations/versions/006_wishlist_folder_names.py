"""Add selected_folder_names to wishlist_config.

Revision ID: 006
Revises: 005
Create Date: 2025-01-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "006"
down_revision: str | None = "005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add selected_folder_names to wishlist_config for display purposes
    op.add_column(
        "wishlist_config",
        sa.Column("selected_folder_names", sa.Text(), nullable=True),  # JSON array
    )


def downgrade() -> None:
    op.drop_column("wishlist_config", "selected_folder_names")
