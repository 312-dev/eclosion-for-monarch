# Blueprint infrastructure module
# Provides Services container and blueprint registration functions

from dataclasses import dataclass
from typing import TYPE_CHECKING

from flask import Flask, g

if TYPE_CHECKING:
    from services.security_service import SecurityService
    from services.sync_service import SyncService
    from state import NotesStateManager


@dataclass
class Services:
    """Container for shared service instances.

    Injected into Flask's g context on each request via init_services().
    Access within route handlers using get_services().
    """

    sync_service: "SyncService"
    security_service: "SecurityService"
    notes_manager: "NotesStateManager"


def get_services() -> Services:
    """Get services from request context.

    Only call within route handlers, never at import time.
    Raises RuntimeError if called outside request context.
    """
    services: Services | None = getattr(g, "services", None)
    if services is None:
        raise RuntimeError("Services not initialized. Call only within request context.")
    return services


def init_services(app: Flask, services: Services | None = None) -> Services:
    """Initialize service instances and inject into request context.

    Call once during app setup, before registering blueprints.

    Args:
        app: The Flask application instance.
        services: Optional pre-created Services instance. If not provided,
                  services will be created automatically.

    Returns the Services instance for use in middleware.
    """
    if services is None:
        from services.security_service import SecurityService
        from services.sync_service import SyncService
        from state import NotesStateManager

        services = Services(
            sync_service=SyncService(),
            security_service=SecurityService(),
            notes_manager=NotesStateManager(),
        )

    @app.before_request
    def inject_services():
        g.services = services

    return services


def register_blueprints(app: Flask) -> None:
    """Register all blueprints with the Flask app.

    Call after init_services() during app setup.
    Blueprints will be added in subsequent phases.
    """
    # Phase 2: Notes blueprint
    from .notes import notes_bp

    app.register_blueprint(notes_bp)

    # Phase 3: Security blueprint
    from .security import security_bp

    app.register_blueprint(security_bp)

    # Phase 4: Auth blueprint
    from .auth import auth_bp

    app.register_blueprint(auth_bp)

    # Phase 5: Settings blueprint
    from .settings import settings_bp

    app.register_blueprint(settings_bp)

    # Phase 6: Admin blueprint
    from .admin import admin_bp

    app.register_blueprint(admin_bp)

    # Phase 7: Recurring blueprint
    from .recurring import recurring_bp

    app.register_blueprint(recurring_bp)

    # Phase 8: Stash blueprint
    from .stash import stash_bp

    app.register_blueprint(stash_bp)

    # Phase 9: IFTTT blueprint
    from .ifttt import ifttt_bp

    app.register_blueprint(ifttt_bp)

    # Phase 10: Internal blueprint (desktop<->Flask IPC)
    from .internal import internal_bp

    app.register_blueprint(internal_bp)
