"""
Migration registry for discovering and managing migrations.
"""

from typing import ClassVar

from .base import Migration


class MigrationRegistry:
    """
    Discovers and registers all available migrations.

    Migrations are registered using the @MigrationRegistry.register decorator.
    The registry provides methods for finding migration paths between versions.
    """

    _migrations: ClassVar[dict[str, type[Migration]]] = {}

    @classmethod
    def register(cls, migration_class: type[Migration]) -> type[Migration]:
        """
        Decorator to register a migration.

        Usage:
            @MigrationRegistry.register
            class V1_0_to_V1_1(Migration):
                from_version = "1.0"
                to_version = "1.1"
                ...
        """
        key = f"{migration_class.from_version}->{migration_class.to_version}"
        cls._migrations[key] = migration_class
        return migration_class

    @classmethod
    def get_migration(cls, from_version: str, to_version: str) -> type[Migration] | None:
        """Get a specific migration by version pair."""
        key = f"{from_version}->{to_version}"
        return cls._migrations.get(key)

    @classmethod
    def get_all_migrations(cls) -> dict[str, type[Migration]]:
        """Get all registered migrations."""
        return cls._migrations.copy()

    @classmethod
    def get_forward_path(
        cls,
        from_version: str,
        to_version: str,
    ) -> list[type[Migration]]:
        """
        Find sequence of migrations to upgrade from one version to another.

        Uses simple graph traversal to find the path. Returns empty list
        if no path exists.

        Args:
            from_version: Starting schema version
            to_version: Target schema version

        Returns:
            List of migration classes to apply in order
        """
        if from_version == to_version:
            return []

        # Build adjacency list for forward migrations
        graph: dict[str, list[type[Migration]]] = {}
        for migration_class in cls._migrations.values():
            if migration_class.from_version not in graph:
                graph[migration_class.from_version] = []
            graph[migration_class.from_version].append(migration_class)

        # BFS to find shortest path
        from collections import deque

        queue: deque[tuple[str, list[type[Migration]]]] = deque([(from_version, [])])
        visited = {from_version}

        while queue:
            current, path = queue.popleft()

            for migration_class in graph.get(current, []):
                new_path = [*path, migration_class]
                if migration_class.to_version == to_version:
                    return new_path
                if migration_class.to_version not in visited:
                    visited.add(migration_class.to_version)
                    queue.append((migration_class.to_version, new_path))

        return []

    @classmethod
    def get_backward_path(
        cls,
        from_version: str,
        to_version: str,
    ) -> list[type[Migration]]:
        """
        Find sequence of migrations to downgrade from one version to another.

        Returns migrations in the order they should be applied (using backward method).

        Args:
            from_version: Starting schema version (newer)
            to_version: Target schema version (older)

        Returns:
            List of migration classes to apply backward methods in order
        """
        if from_version == to_version:
            return []

        # Build adjacency list for backward migrations (reverse direction)
        graph: dict[str, list[type[Migration]]] = {}
        for migration_class in cls._migrations.values():
            # For backward, we go from to_version back to from_version
            if migration_class.to_version not in graph:
                graph[migration_class.to_version] = []
            graph[migration_class.to_version].append(migration_class)

        # BFS to find path
        from collections import deque

        queue: deque[tuple[str, list[type[Migration]]]] = deque([(from_version, [])])
        visited = {from_version}

        while queue:
            current, path = queue.popleft()

            for migration_class in graph.get(current, []):
                new_path = [*path, migration_class]
                if migration_class.from_version == to_version:
                    return new_path
                if migration_class.from_version not in visited:
                    visited.add(migration_class.from_version)
                    queue.append((migration_class.from_version, new_path))

        return []

    @classmethod
    def clear(cls) -> None:
        """Clear all registered migrations (useful for testing)."""
        cls._migrations.clear()
