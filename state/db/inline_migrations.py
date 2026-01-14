"""
Inline Database Migrations

Version-based migration system for packaged desktop apps.
Runs on app startup when Alembic is not available (PyInstaller builds).

How to add a new migration:
1. Create Alembic migration for development: `alembic revision -m "description"`
2. Add equivalent inline migration to MIGRATIONS list below
3. Bump SCHEMA_VERSION

Migrations are idempotent - they only run if DB version < migration version.
"""

import logging
import sqlite3
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

# Current schema version - bump when adding migrations
SCHEMA_VERSION = 2

# Migration definitions
# Each migration runs only if current DB version < migration version
MIGRATIONS = [
    # Version 1: Initial schema
    # Handled by SQLAlchemy create_all() - no SQL needed
    # Tables: notes, general_notes, archived_notes, known_categories, etc.
    {
        "version": 1,
        "description": "Initial schema (handled by create_all)",
        "sql": None,  # No SQL - create_all handles this
    },
    # Version 2: Checkbox states with JSON storage
    # Replaces old per-row checkbox storage with JSON array
    {
        "version": 2,
        "description": "Checkbox states with JSON storage",
        "sql": """
            -- Drop old checkbox_states table if it exists
            DROP TABLE IF EXISTS checkbox_states;

            -- Create new checkbox_states with JSON storage
            CREATE TABLE checkbox_states (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                note_id VARCHAR(36) REFERENCES notes(id) ON DELETE CASCADE,
                general_note_month_key VARCHAR(10),
                viewing_month VARCHAR(10) NOT NULL,
                states_json TEXT NOT NULL DEFAULT '[]',
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            );

            -- Create indexes
            CREATE UNIQUE INDEX idx_checkbox_note_viewing
                ON checkbox_states (note_id, viewing_month);
            CREATE UNIQUE INDEX idx_checkbox_general_viewing
                ON checkbox_states (general_note_month_key, viewing_month);
        """,
    },
    # Future migrations go here:
    # {
    #     "version": 3,
    #     "description": "Add new feature column",
    #     "sql": "ALTER TABLE notes ADD COLUMN new_column TEXT;",
    # },
]


def get_schema_version(conn: sqlite3.Connection) -> int:
    """Get current schema version from database."""
    cursor = conn.cursor()

    # Check if schema_version table exists
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='schema_version'
    """)

    if not cursor.fetchone():
        # Table doesn't exist - check if this is a fresh DB or legacy
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='notes'
        """)
        if cursor.fetchone():
            # Has tables but no version tracking - legacy DB at version 1
            return 1
        else:
            # Fresh database
            return 0

    # Get version from table
    cursor.execute("SELECT version FROM schema_version LIMIT 1")
    row = cursor.fetchone()
    return row[0] if row else 0


def set_schema_version(conn: sqlite3.Connection, version: int) -> None:
    """Set schema version in database."""
    cursor = conn.cursor()

    # Ensure table exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schema_version (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            version INTEGER NOT NULL,
            updated_at DATETIME NOT NULL
        )
    """)

    # Upsert version
    cursor.execute(
        """
        INSERT INTO schema_version (id, version, updated_at)
        VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            version = excluded.version,
            updated_at = excluded.updated_at
    """,
        (version, datetime.utcnow().isoformat()),
    )

    conn.commit()


def run_migrations(db_path: Path) -> None:
    """
    Run pending migrations on the database.

    Called on app startup. Safe to call multiple times -
    only runs migrations newer than current DB version.
    """
    if not db_path.exists():
        logger.info("Database does not exist yet, skipping migrations")
        return

    conn = sqlite3.connect(db_path)
    try:
        current_version = get_schema_version(conn)
        logger.info(f"Current schema version: {current_version}, target: {SCHEMA_VERSION}")

        if current_version >= SCHEMA_VERSION:
            logger.info("Database is up to date")
            return

        # Run each migration in order
        for migration in MIGRATIONS:
            version: int = migration["version"]  # type: ignore[assignment]

            if current_version >= version:
                continue  # Already applied

            description: str = migration["description"]  # type: ignore[assignment]
            sql: str | None = migration["sql"]  # type: ignore[assignment]

            logger.info(f"Running migration v{version}: {description}")

            if sql:
                # Execute migration SQL
                cursor = conn.cursor()
                cursor.executescript(sql)
                conn.commit()

            # Update version after each successful migration
            set_schema_version(conn, version)
            logger.info(f"Migration v{version} complete")

        logger.info(f"All migrations complete. Schema version: {SCHEMA_VERSION}")

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        conn.close()


def ensure_schema_current(db_path: Path) -> None:
    """
    Ensure database schema is current.

    This is the main entry point called from init_db().
    Creates schema_version table if needed and runs pending migrations.
    """
    run_migrations(db_path)
