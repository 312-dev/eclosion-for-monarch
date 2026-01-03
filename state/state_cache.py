"""
Request-Scoped State Cache

Reduces disk I/O by caching state within a single request.
Instead of 21+ state loads per request, loads once and saves once at the end.

Usage:
    from state.state_cache import state_cache

    # In API handler:
    with state_cache.request_scope():
        # All state operations use cached state
        state = state_cache.get_state()
        state.enabled_items.add("new_item")
        state_cache.mark_dirty()
        # State is auto-saved when context exits
"""

import threading
from contextlib import contextmanager

from state.state_manager import StateManager, TrackerState


class RequestScopedStateCache:
    """
    Thread-safe, request-scoped cache for TrackerState.

    Within a request scope:
    - First get_state() loads from disk
    - Subsequent get_state() returns cached copy
    - mark_dirty() flags state for saving
    - Exiting scope saves if dirty
    """

    def __init__(self, state_manager: StateManager | None = None):
        self._state_manager = state_manager or StateManager()
        # Thread-local storage for request-scoped cache
        self._local = threading.local()

    @property
    def _cache(self) -> TrackerState | None:
        return getattr(self._local, 'cache', None)

    @_cache.setter
    def _cache(self, value: TrackerState | None):
        self._local.cache = value

    @property
    def _dirty(self) -> bool:
        return getattr(self._local, 'dirty', False)

    @_dirty.setter
    def _dirty(self, value: bool):
        self._local.dirty = value

    @property
    def _in_scope(self) -> bool:
        return getattr(self._local, 'in_scope', False)

    @_in_scope.setter
    def _in_scope(self, value: bool):
        self._local.in_scope = value

    def get_state(self) -> TrackerState:
        """
        Get the current state, loading from disk if not cached.

        When inside a request_scope, returns cached state.
        When outside, always loads fresh from disk (backwards compatible).
        """
        if self._in_scope:
            if self._cache is None:
                self._cache = self._state_manager.load()
            return self._cache
        else:
            # Outside scope - load fresh (backwards compatible)
            return self._state_manager.load()

    def mark_dirty(self) -> None:
        """
        Mark the cached state as dirty (needs saving).

        Call this after modifying the state within a request scope.
        """
        self._dirty = True

    def save_if_dirty(self) -> bool:
        """
        Save state to disk if marked dirty.

        Returns True if state was saved, False otherwise.
        """
        if self._dirty and self._cache is not None:
            self._state_manager.save(self._cache)
            self._dirty = False
            return True
        return False

    def force_save(self) -> None:
        """
        Force save the current cached state.

        Use when you need to ensure state is persisted immediately.
        """
        if self._cache is not None:
            self._state_manager.save(self._cache)
            self._dirty = False

    def invalidate(self) -> None:
        """
        Invalidate the cache, forcing next get_state to reload.

        Use after external modifications to state file.
        """
        self._cache = None
        self._dirty = False

    @contextmanager
    def request_scope(self):
        """
        Context manager for request-scoped caching.

        Usage:
            with state_cache.request_scope():
                state = state_cache.get_state()
                # ... modify state ...
                state_cache.mark_dirty()
            # State is auto-saved on exit if dirty

        Supports nested scopes (inner scopes are no-ops).
        """
        was_in_scope = self._in_scope

        if not was_in_scope:
            # Entering fresh scope
            self._cache = None
            self._dirty = False
            self._in_scope = True

        try:
            yield
        finally:
            if not was_in_scope:
                # Exiting outermost scope - save if dirty
                self.save_if_dirty()
                self._cache = None
                self._dirty = False
                self._in_scope = False


# Global singleton instance
state_cache = RequestScopedStateCache()
