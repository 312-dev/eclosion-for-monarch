"""
Encryption utilities for credential storage.

Uses Fernet (AES-128-CBC with HMAC-SHA256) for symmetric encryption.
Key derivation uses PBKDF2 with SHA-256.

Security Model:
- User provides a passphrase that never leaves the server's memory
- Passphrase is used with PBKDF2 to derive an encryption key
- Salt is stored with the encrypted data (not secret, just ensures unique keys)
- Server cannot decrypt credentials without the user's passphrase
"""

import base64
import re
import secrets

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# PBKDF2 parameters - high iteration count for security
PBKDF2_ITERATIONS = 480000  # OWASP recommendation for 2023+
SALT_LENGTH = 16  # 128 bits


class PassphraseValidationError(Exception):
    """Raised when passphrase doesn't meet requirements."""

    pass


def validate_passphrase(passphrase: str) -> tuple[bool, list]:
    """
    Validate passphrase meets complexity requirements.

    Requirements:
    - Minimum 12 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 number
    - At least 1 special character

    Returns:
        Tuple of (is_valid, list of unmet requirements)
    """
    requirements = []

    if len(passphrase) < 12:
        requirements.append("At least 12 characters")
    if not re.search(r"[A-Z]", passphrase):
        requirements.append("At least 1 uppercase letter")
    if not re.search(r"[a-z]", passphrase):
        requirements.append("At least 1 lowercase letter")
    if not re.search(r"[0-9]", passphrase):
        requirements.append("At least 1 number")
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:\'",.<>?/\\`~]', passphrase):
        requirements.append("At least 1 special character")

    return len(requirements) == 0, requirements


def derive_key(passphrase: str, salt: bytes) -> bytes:
    """
    Derive a Fernet-compatible key from a passphrase using PBKDF2.

    Args:
        passphrase: User-provided passphrase
        salt: Random salt (should be stored with encrypted data)

    Returns:
        32-byte key suitable for Fernet (base64 encoded to 44 chars)
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=PBKDF2_ITERATIONS,
    )
    key = kdf.derive(passphrase.encode("utf-8"))
    # Fernet requires base64-encoded 32-byte key
    return base64.urlsafe_b64encode(key)


def generate_salt() -> bytes:
    """Generate a cryptographically secure random salt."""
    return secrets.token_bytes(SALT_LENGTH)


class CredentialEncryption:
    """
    Handles encryption/decryption of credentials using user passphrase.

    Usage:
        # Encrypting (new user or passphrase change)
        enc = CredentialEncryption(passphrase="user-secret-passphrase")
        encrypted = enc.encrypt("my-monarch-password")
        salt = enc.get_salt()  # Store this with the encrypted data

        # Decrypting (returning user)
        enc = CredentialEncryption(passphrase="user-secret-passphrase", salt=stored_salt)
        decrypted = enc.decrypt(encrypted)
    """

    def __init__(self, passphrase: str, salt: bytes | None = None):
        """
        Initialize encryption with passphrase.

        Args:
            passphrase: User's encryption passphrase
            salt: Existing salt for decryption, or None to generate new
        """
        self._salt = salt if salt else generate_salt()
        key = derive_key(passphrase, self._salt)
        self._fernet = Fernet(key)

    def get_salt(self) -> bytes:
        """Get the salt (must be stored with encrypted data)."""
        return self._salt

    def get_salt_b64(self) -> str:
        """Get the salt as a base64-encoded string for JSON storage."""
        return base64.b64encode(self._salt).decode("utf-8")

    @staticmethod
    def salt_from_b64(salt_b64: str) -> bytes:
        """Convert base64-encoded salt back to bytes."""
        return base64.b64decode(salt_b64.encode("utf-8"))

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext and return base64-encoded ciphertext.

        Args:
            plaintext: String to encrypt

        Returns:
            Base64-encoded ciphertext (safe for JSON storage)
        """
        if not plaintext:
            return ""
        ciphertext = self._fernet.encrypt(plaintext.encode("utf-8"))
        return ciphertext.decode("utf-8")

    def decrypt(self, ciphertext: str) -> str:
        """
        Decrypt base64-encoded ciphertext.

        Args:
            ciphertext: Base64-encoded ciphertext from encrypt()

        Returns:
            Original plaintext string

        Raises:
            InvalidToken: If decryption fails (wrong passphrase or corrupted data)
        """
        if not ciphertext:
            return ""
        plaintext = self._fernet.decrypt(ciphertext.encode("utf-8"))
        return plaintext.decode("utf-8")


class DecryptionError(Exception):
    """Raised when decryption fails (wrong passphrase or corrupted data)."""

    pass
