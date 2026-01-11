"""
SQLite database module for Eclosion.

Provides SQLAlchemy-based persistence with Alembic migrations.
"""

from .database import db_session, get_engine, init_db

__all__ = [
    "db_session",
    "get_engine",
    "init_db",
]
