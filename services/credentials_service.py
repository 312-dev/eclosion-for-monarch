"""
Credentials Service

Manages authentication and credential lifecycle:
- Login/logout with Monarch API
- Passphrase-based credential encryption
- Session credential management
- Credential validation and updates

Extracted from SyncService to improve separation of concerns.
"""

import logging
import os
from typing import Any

from core.error_detection import format_auth_response, is_rate_limit_error
from monarch_utils import get_mm
from state.state_manager import CredentialsManager

logger = logging.getLogger(__name__)


class CredentialsService:
    """Manages authentication and credential lifecycle."""

    # In-memory session storage for decrypted credentials
    # In a multi-user deployment, this should be replaced with proper session management
    _session_credentials: dict[str, str] | None = None
    _pending_credentials: dict[str, str] | None = None  # Temp storage before passphrase is set

    def __init__(self):
        self.credentials_manager = CredentialsManager()

    def has_stored_credentials(self) -> bool:
        """Check if encrypted credentials exist on disk."""
        return self.credentials_manager.exists()

    async def check_auth(self) -> bool:
        """Check if session has active credentials (unlocked)."""
        # Check in-memory session first
        if CredentialsService._session_credentials:
            return True
        # Also check env vars as fallback
        email, password, _ = self._get_env_credentials()
        return bool(email and password)

    async def validate_auth(self) -> bool:
        """
        Validate that session credentials are still valid with the Monarch API.

        Returns True if credentials exist AND are valid.
        Returns False if no credentials or if validation fails.
        """
        # Try session credentials first
        if CredentialsService._session_credentials:
            email = CredentialsService._session_credentials.get("email")
            password = CredentialsService._session_credentials.get("password")
            mfa_secret = CredentialsService._session_credentials.get("mfa_secret", "")
        else:
            # Fall back to env vars
            email, password, mfa_secret = self._get_env_credentials()
            if not email or not password:
                return False

        try:
            # Attempt to get authenticated client - this validates credentials
            await get_mm(email=email, password=password, mfa_secret_key=mfa_secret)
            return True
        except Exception as e:
            # If it's a rate limit, don't clear credentials - just report as valid
            if is_rate_limit_error(e):
                return True
            # For auth failures, clear session
            CredentialsService._session_credentials = None
            return False

    def _get_env_credentials(self):
        """Get credentials from environment variables."""
        return (
            os.environ.get("MONARCH_MONEY_EMAIL"),
            os.environ.get("MONARCH_MONEY_PASSWORD"),
            os.environ.get("MFA_SECRET_KEY", ""),
        )

    def get_session_credentials(self) -> dict[str, str] | None:
        """Get the current session credentials if unlocked."""
        return CredentialsService._session_credentials

    async def login(self, email: str, password: str, mfa_secret: str = "") -> dict[str, Any]:
        """
        Validate credentials by attempting to login to Monarch.
        Does NOT save credentials - returns needs_passphrase=True on success.
        Caller must then call set_passphrase() to encrypt and save.
        """
        try:
            await get_mm(email=email, password=password, mfa_secret_key=mfa_secret)
            # Store temporarily until passphrase is set
            CredentialsService._pending_credentials = {
                "email": email,
                "password": password,
                "mfa_secret": mfa_secret,
            }
            return {
                "success": True,
                "needs_passphrase": True,
                "message": "Monarch login successful. Please create an encryption passphrase.",
            }
        except Exception as e:
            return format_auth_response(e, has_mfa_secret=bool(mfa_secret))

    def set_passphrase(self, passphrase: str) -> dict[str, Any]:
        """
        Set the encryption passphrase and save credentials.
        Must be called after successful login().
        """
        from core.encryption import validate_passphrase

        # Validate passphrase complexity
        is_valid, unmet_requirements = validate_passphrase(passphrase)
        if not is_valid:
            return {
                "success": False,
                "error": "Passphrase does not meet requirements",
                "requirements": unmet_requirements,
            }

        if not CredentialsService._pending_credentials:
            return {
                "success": False,
                "error": "No pending credentials. Please login first.",
            }

        # Save encrypted credentials
        self.credentials_manager.save(
            email=CredentialsService._pending_credentials["email"],
            password=CredentialsService._pending_credentials["password"],
            mfa_secret=CredentialsService._pending_credentials.get("mfa_secret", ""),
            passphrase=passphrase,
        )

        # Move to session and clear pending
        CredentialsService._session_credentials = CredentialsService._pending_credentials
        CredentialsService._pending_credentials = None

        return {"success": True, "message": "Credentials encrypted and saved."}

    def unlock(self, passphrase: str) -> dict[str, Any]:
        """
        Unlock stored credentials with the passphrase.
        Used when returning to the app with existing encrypted credentials.
        """
        from core.encryption import DecryptionError

        if not self.credentials_manager.exists():
            return {"success": False, "error": "No stored credentials found."}

        try:
            creds = self.credentials_manager.load(passphrase)
            if creds:
                CredentialsService._session_credentials = creds
                return {"success": True, "message": "Credentials unlocked."}
            return {"success": False, "error": "Failed to load credentials."}
        except DecryptionError:
            return {"success": False, "error": "Invalid passphrase."}

    def logout(self) -> None:
        """Clear stored credentials and session."""
        self.credentials_manager.clear()
        CredentialsService._session_credentials = None
        CredentialsService._pending_credentials = None

    def lock(self) -> None:
        """Lock the session without clearing stored credentials."""
        CredentialsService._session_credentials = None

    async def unlock_and_validate(self, passphrase: str) -> dict[str, Any]:
        """
        Unlock stored credentials AND validate them against Monarch API.

        Returns:
            success: True if both unlock AND validation succeed
            unlock_success: True if passphrase was correct (decryption worked)
            validation_success: True if Monarch accepted the credentials
            needs_credential_update: True if decryption worked but Monarch rejected
            error: Error message if any step failed
        """
        from core.encryption import DecryptionError

        if not self.credentials_manager.exists():
            return {
                "success": False,
                "unlock_success": False,
                "error": "No stored credentials found.",
            }

        # Step 1: Try to decrypt credentials
        try:
            creds = self.credentials_manager.load(passphrase)
            if not creds:
                return {
                    "success": False,
                    "unlock_success": False,
                    "error": "Failed to load credentials.",
                }
        except DecryptionError:
            return {
                "success": False,
                "unlock_success": False,
                "error": "Invalid passphrase.",
            }

        # Step 2: Validate credentials against Monarch API
        email = creds.get("email")
        password = creds.get("password")
        mfa_secret = creds.get("mfa_secret", "")

        try:
            await get_mm(email=email, password=password, mfa_secret_key=mfa_secret)
            # Both decryption and validation succeeded
            CredentialsService._session_credentials = creds
            return {
                "success": True,
                "unlock_success": True,
                "validation_success": True,
                "message": "Credentials unlocked and validated.",
            }
        except Exception as e:
            # If it's a rate limit, treat as success to not lock users out
            if is_rate_limit_error(e):
                CredentialsService._session_credentials = creds
                return {
                    "success": True,
                    "unlock_success": True,
                    "validation_success": True,
                    "message": "Credentials unlocked (validation skipped due to rate limit).",
                }
            # Decryption succeeded but Monarch rejected credentials
            return {
                "success": False,
                "unlock_success": True,
                "validation_success": False,
                "needs_credential_update": True,
                "error": "Your Monarch credentials are no longer valid. Please enter new credentials.",
            }

    async def update_credentials(
        self, email: str, password: str, mfa_secret: str, passphrase: str
    ) -> dict[str, Any]:
        """
        Validate new Monarch credentials and save them encrypted with the provided passphrase.

        Used when:
        - User's existing credentials failed Monarch validation
        - User enters new Monarch email/password
        - Credentials are re-encrypted with the SAME passphrase they used to unlock

        Returns:
            success: True if validation and save succeeded
            needs_mfa: True if MFA is required
            error: Error message if validation failed
        """
        from core.encryption import validate_passphrase

        # Validate passphrase still meets requirements (it should, since they just used it)
        is_valid, unmet_requirements = validate_passphrase(passphrase)
        if not is_valid:
            return {
                "success": False,
                "error": "Passphrase does not meet requirements",
                "requirements": unmet_requirements,
            }

        # Validate credentials against Monarch
        try:
            await get_mm(email=email, password=password, mfa_secret_key=mfa_secret)
        except Exception as e:
            return format_auth_response(e, has_mfa_secret=bool(mfa_secret))

        # Save encrypted credentials with the provided passphrase
        self.credentials_manager.save(
            email=email,
            password=password,
            mfa_secret=mfa_secret,
            passphrase=passphrase,
        )

        # Store in session
        CredentialsService._session_credentials = {
            "email": email,
            "password": password,
            "mfa_secret": mfa_secret,
        }

        return {"success": True, "message": "Credentials updated and saved."}

    def reset_credentials_only(self) -> None:
        """
        Clear only credentials, preserving preferences (linked categories, rollups).

        Used when:
        - User forgot their passphrase
        - User wants to re-login without losing their configuration

        This deletes credentials.json but keeps tracker_state.json intact.
        """
        self.credentials_manager.clear()
        CredentialsService._session_credentials = None
        CredentialsService._pending_credentials = None
