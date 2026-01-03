"""
Automation credentials manager.

Handles server-encrypted credentials for background sync.
Unlike user credentials (encrypted with passphrase), these
can be decrypted by the server for automated operations.

Security Model:
- Credentials are encrypted with a key derived from .session_secret
- The server can decrypt these autonomously (no user interaction needed)
- User must explicitly consent to enable this feature
- Original passphrase-protected credentials remain separate
"""

import json
import logging
import os
from datetime import datetime
from pathlib import Path

from . import config
from .encryption import CredentialEncryption

logger = logging.getLogger(__name__)


def _get_server_key_source() -> str:
    """
    Get the server's secret for key derivation.

    Looks for .session_secret file first, then falls back to
    SESSION_SECRET environment variable.

    Returns:
        Server secret string, or empty string if not found
    """
    # Primary location from config
    if config.SESSION_SECRET_FILE.exists():
        try:
            return config.SESSION_SECRET_FILE.read_text().strip()
        except Exception:
            pass

    # Legacy locations for backward compatibility
    legacy_paths = [
        Path(__file__).parent.parent / ".session_secret",
        Path("/app/.session_secret"),
    ]
    for secret_file in legacy_paths:
        if secret_file.exists():
            try:
                return secret_file.read_text().strip()
            except Exception:
                continue

    # Fall back to env var
    return os.environ.get("SESSION_SECRET", "")


class AutomationCredentialsManager:
    """
    Manages server-encrypted automation credentials.

    These credentials can be decrypted by the server without user
    interaction, enabling background sync operations.
    """

    def __init__(self, creds_file: Path | None = None):
        """
        Initialize the automation credentials manager.

        Args:
            creds_file: Path to credentials file (auto-detected if None)
        """
        if creds_file is None:
            creds_file = config.AUTOMATION_CREDENTIALS_FILE
        self.creds_file = creds_file

    def _get_server_passphrase(self) -> str:
        """
        Derive a passphrase from server secret.

        Uses a domain separator to ensure this key is distinct
        from any user-provided passphrases.

        Returns:
            Server-derived passphrase

        Raises:
            ValueError: If no server secret is available
        """
        source = _get_server_key_source()
        if not source:
            raise ValueError("No server secret available for automation")
        # Add a domain separator to distinguish from user passphrases
        return f"automation-credentials:{source}"

    def exists(self) -> bool:
        """Check if automation credentials file exists."""
        return self.creds_file.exists()

    def is_enabled(self) -> bool:
        """
        Check if automation is enabled.

        Returns:
            True if automation credentials exist and are enabled
        """
        if not self.exists():
            return False
        try:
            with open(self.creds_file) as f:
                data = json.load(f)
            return bool(data.get("automation_enabled", False))
        except Exception:
            return False

    def save(self, email: str, password: str, mfa_secret: str) -> None:
        """
        Save credentials encrypted with server key.

        Args:
            email: Monarch Money email
            password: Monarch Money password
            mfa_secret: Optional MFA secret key
        """
        self.creds_file.parent.mkdir(parents=True, exist_ok=True)

        passphrase = self._get_server_passphrase()
        enc = CredentialEncryption(passphrase=passphrase)

        data = {
            "encrypted": True,
            "automation_enabled": True,
            "version": "1.0",
            "salt": enc.get_salt_b64(),
            "email": enc.encrypt(email),
            "password": enc.encrypt(password),
            "mfa_secret": enc.encrypt(mfa_secret) if mfa_secret else "",
            "created_at": datetime.now().isoformat(),
            "enabled_by_user": True,
        }

        with open(self.creds_file, "w") as f:
            json.dump(data, f, indent=2)

        # Restrict file permissions (owner read/write only)
        os.chmod(self.creds_file, 0o600)
        logger.info("Automation credentials saved")

    def load(self) -> dict[str, str] | None:
        """
        Load and decrypt automation credentials.

        Returns:
            Dict with email, password, mfa_secret or None if not available

        Note:
            Returns None (doesn't raise) on any error to allow
            graceful fallback in automated contexts.
        """
        if not self.exists():
            return None

        try:
            with open(self.creds_file) as f:
                data = json.load(f)

            if not data.get("automation_enabled"):
                return None

            passphrase = self._get_server_passphrase()
            salt = CredentialEncryption.salt_from_b64(data["salt"])
            enc = CredentialEncryption(passphrase=passphrase, salt=salt)

            return {
                "email": enc.decrypt(data["email"]),
                "password": enc.decrypt(data["password"]),
                "mfa_secret": (
                    enc.decrypt(data.get("mfa_secret", "")) if data.get("mfa_secret") else ""
                ),
            }
        except Exception as e:
            logger.error(f"Failed to load automation credentials: {e}")
            return None

    def disable(self) -> None:
        """
        Disable automation (mark as disabled, don't delete).

        Preserves the encrypted data in case user wants to re-enable,
        but marks it as disabled so it won't be used.
        """
        if self.exists():
            try:
                with open(self.creds_file) as f:
                    data = json.load(f)
                data["automation_enabled"] = False
                data["disabled_at"] = datetime.now().isoformat()
                with open(self.creds_file, "w") as f:
                    json.dump(data, f, indent=2)
                logger.info("Automation credentials disabled")
            except Exception as e:
                logger.error(f"Failed to disable automation credentials: {e}")

    def clear(self) -> None:
        """Delete automation credentials entirely."""
        if self.creds_file.exists():
            self.creds_file.unlink()
            logger.info("Automation credentials deleted")
