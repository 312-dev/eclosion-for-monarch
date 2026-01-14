"""
Database engine and session management.
"""

from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from core import config

# Database file path
DATABASE_PATH = config.STATE_DIR / "eclosion.db"

# Global engine instance (lazily initialized)
_engine: Engine | None = None
_SessionLocal: sessionmaker | None = None


def get_engine() -> Engine:
    """Get or create the database engine."""
    global _engine
    if _engine is None:
        _engine = create_engine(
            f"sqlite:///{DATABASE_PATH}",
            # SQLite-specific settings
            connect_args={"check_same_thread": False},
            # Echo SQL in debug mode
            echo=config.DEBUG_MODE,
        )

        # Enable foreign keys for SQLite
        @event.listens_for(_engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")  # Better concurrency
            cursor.close()

    return _engine


def get_session_factory() -> sessionmaker:
    """Get or create the session factory."""
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            bind=get_engine(),
            autocommit=False,
            autoflush=False,
        )
    return _SessionLocal


@contextmanager
def db_session() -> Generator[Session, None, None]:
    """
    Provide a transactional scope around a series of operations.

    Usage:
        with db_session() as session:
            session.add(model)
            session.commit()
    """
    session = get_session_factory()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db() -> None:
    """
    Initialize the database.

    In development: Uses Alembic migrations.
    In packaged apps: Uses inline migrations, then create_all() for new tables.

    This should be called on application startup.
    """
    import logging

    logger = logging.getLogger(__name__)

    # Ensure state directory exists
    config.STATE_DIR.mkdir(parents=True, exist_ok=True)

    # Get the alembic.ini path (relative to project root)
    project_root = Path(__file__).parent.parent.parent
    alembic_ini = project_root / "alembic.ini"

    if alembic_ini.exists():
        # Development mode: use Alembic
        from alembic import command
        from alembic.config import Config

        alembic_cfg = Config(str(alembic_ini))
        # Override the script location to be absolute
        alembic_cfg.set_main_option(
            "script_location", str(project_root / "state" / "db" / "migrations")
        )
        command.upgrade(alembic_cfg, "head")
    else:
        # Packaged app mode: use inline migrations
        logger.info("Alembic not available, using inline migrations")

        from .inline_migrations import ensure_schema_current
        from .models import Base

        # Run inline migrations for existing databases
        ensure_schema_current(DATABASE_PATH)

        # Create any new tables (safe to call on existing DB)
        Base.metadata.create_all(bind=get_engine())


def backup_database(reason: str = "manual") -> Path | None:
    """
    Create an atomic backup of the database.

    Args:
        reason: Reason for backup (for filename)

    Returns:
        Path to backup file, or None if database doesn't exist
    """
    import sqlite3
    from datetime import datetime

    if not DATABASE_PATH.exists():
        return None

    # Ensure backup directory exists
    config.BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    # Create timestamped backup filename
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_path = config.BACKUP_DIR / f"eclosion.{timestamp}.{reason}.db"

    # Use SQLite's backup API for atomic backup
    source = sqlite3.connect(DATABASE_PATH)
    dest = sqlite3.connect(backup_path)
    source.backup(dest)
    source.close()
    dest.close()

    # Cleanup old backups (keep MAX_BACKUPS)
    _cleanup_old_backups()

    return backup_path


def _cleanup_old_backups() -> None:
    """Remove old backups, keeping only MAX_BACKUPS most recent."""
    if not config.BACKUP_DIR.exists():
        return

    backups = sorted(
        config.BACKUP_DIR.glob("eclosion.*.db"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    for old_backup in backups[config.MAX_BACKUPS :]:
        old_backup.unlink()
