"""
Migrate checkbox_states to JSON-based storage.

Revision ID: 002
Revises: 001
Create Date: 2026-01-14

The old schema stored one row per checkbox:
    checkbox_index INTEGER, is_checked BOOLEAN

The new schema stores all states in a JSON array:
    states_json TEXT (JSON array of booleans)

Since checkbox states are ephemeral (per-viewing-month, reset mode),
we drop and recreate the table instead of migrating data.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Drop old checkbox_states and create new schema."""
    # Drop old table (if exists - may have been manually migrated)
    op.execute("DROP TABLE IF EXISTS checkbox_states")

    # Create new table with JSON states column
    op.create_table(
        "checkbox_states",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("note_id", sa.String(length=36), nullable=True),
        sa.Column("general_note_month_key", sa.String(length=10), nullable=True),
        sa.Column("viewing_month", sa.String(length=10), nullable=False),
        sa.Column("states_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["note_id"],
            ["notes.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes
    op.create_index(
        "idx_checkbox_note_viewing",
        "checkbox_states",
        ["note_id", "viewing_month"],
        unique=True,
    )
    op.create_index(
        "idx_checkbox_general_viewing",
        "checkbox_states",
        ["general_note_month_key", "viewing_month"],
        unique=True,
    )


def downgrade() -> None:
    """Revert to old per-checkbox-row schema."""
    # Drop new table
    op.drop_table("checkbox_states")

    # Recreate old table
    op.create_table(
        "checkbox_states",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("note_id", sa.String(length=36), nullable=True),
        sa.Column("general_note_month_key", sa.String(length=10), nullable=True),
        sa.Column("viewing_month", sa.String(length=10), nullable=True),
        sa.Column("checkbox_index", sa.Integer(), nullable=False),
        sa.Column("is_checked", sa.Boolean(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["note_id"],
            ["notes.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_checkbox_note",
        "checkbox_states",
        ["note_id", "viewing_month", "checkbox_index"],
    )
    op.create_index(
        "idx_checkbox_general",
        "checkbox_states",
        ["general_note_month_key", "viewing_month", "checkbox_index"],
    )
