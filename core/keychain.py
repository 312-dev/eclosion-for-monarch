"""
OS Keychain Integration for Background Sync

Uses the `keyring` library to store the passphrase in the OS-native
secure credential storage:
- macOS: Keychain
- Windows: Windows Credential Manager
- Linux: Secret Service (GNOME Keyring / KWallet)

This allows the standalone sync CLI to access the passphrase without
requiring Electron's safeStorage API.
"""

import logging
import os

import keyring
from keyring.errors import PasswordDeleteError

logger = logging.getLogger(__name__)

# Service name varies by release channel to isolate beta from stable
# RELEASE_CHANNEL is set by the Electron app when spawning the backend
_RELEASE_CHANNEL = os.environ.get("RELEASE_CHANNEL", "stable")
SERVICE_NAME = "eclosion-beta" if _RELEASE_CHANNEL == "beta" else "eclosion"

# Account name for the background sync passphrase
ACCOUNT_NAME = "background-sync-passphrase"


def store_passphrase(passphrase: str) -> bool:
    """
    Store the passphrase in the OS keychain.

    Args:
        passphrase: The user's encryption passphrase

    Returns:
        True if storage succeeded, False otherwise
    """
    try:
        keyring.set_password(SERVICE_NAME, ACCOUNT_NAME, passphrase)
        logger.info("Passphrase stored in OS keychain (service=%s)", SERVICE_NAME)
        return True
    except Exception as e:
        logger.error("Failed to store passphrase in keychain: %s", e)
        return False


def get_passphrase() -> str | None:
    """
    Retrieve the passphrase from the OS keychain.

    Returns:
        The stored passphrase, or None if not found
    """
    try:
        passphrase = keyring.get_password(SERVICE_NAME, ACCOUNT_NAME)
        if passphrase:
            logger.debug("Passphrase retrieved from OS keychain")
        else:
            logger.debug("No passphrase found in OS keychain")
        return passphrase
    except Exception as e:
        logger.error("Failed to retrieve passphrase from keychain: %s", e)
        return None


def delete_passphrase() -> bool:
    """
    Remove the passphrase from the OS keychain.

    Returns:
        True if deletion succeeded (or passphrase didn't exist), False on error
    """
    try:
        keyring.delete_password(SERVICE_NAME, ACCOUNT_NAME)
        logger.info("Passphrase deleted from OS keychain")
        return True
    except PasswordDeleteError:
        # Password doesn't exist - that's fine
        logger.debug("No passphrase to delete from keychain")
        return True
    except Exception as e:
        logger.error("Failed to delete passphrase from keychain: %s", e)
        return False


def is_passphrase_stored() -> bool:
    """
    Check if a passphrase is stored in the OS keychain.

    Returns:
        True if a passphrase exists, False otherwise
    """
    return get_passphrase() is not None


def get_keychain_backend() -> str:
    """
    Get the name of the keyring backend in use.

    Useful for debugging and diagnostics.

    Returns:
        Name of the active keyring backend
    """
    return keyring.get_keyring().name
