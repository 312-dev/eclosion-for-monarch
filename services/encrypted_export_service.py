"""
Encrypted Export Service

Handles encrypted export and import of application settings for auto-backup.
Uses Fernet (AES-128-CBC + HMAC-SHA256) encryption with PBKDF2 key derivation.

The encryption passphrase is derived from the user's Monarch credentials
(email + password), allowing backups to be decrypted only with the correct
credentials at the time of backup.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from cryptography.fernet import InvalidToken

from core.encryption import CredentialEncryption
from services.settings_export_service import SettingsExportService


@dataclass
class EncryptedExportResult:
    """Result of an encrypted export operation."""

    success: bool
    salt: str | None = None  # Base64-encoded salt for decryption
    data: str | None = None  # Base64-encoded encrypted JSON
    error: str | None = None


@dataclass
class EncryptedImportResult:
    """Result of an encrypted import operation."""

    success: bool
    needs_credentials: bool = False  # True if decryption failed with given creds
    imported: dict[str, bool] | None = None
    warnings: list[str] | None = None
    error: str | None = None


class EncryptedExportService:
    """
    Handles encrypted export and import of application settings.

    Export flow:
    1. Get settings export from SettingsExportService
    2. Serialize to JSON
    3. Encrypt with user's Monarch credentials (email + password)
    4. Return encrypted blob + salt

    Import flow:
    1. Decrypt with user's Monarch credentials
    2. Parse JSON
    3. Import via SettingsExportService
    """

    def __init__(self, export_service: SettingsExportService | None = None):
        self.export_service = export_service or SettingsExportService()

    def export_encrypted(
        self,
        passphrase: str,
        app_settings: dict[str, Any] | None = None,
        include_notes: bool = True,
        include_wishlist: bool = True,
    ) -> EncryptedExportResult:
        """
        Export settings as encrypted JSON.

        Args:
            passphrase: Encryption passphrase (email + password)
            app_settings: Optional frontend app settings
            include_notes: Include notes tool data (default True for encrypted exports)
            include_wishlist: Include wishlist tool data (default True)

        Returns:
            EncryptedExportResult with salt and encrypted data

        Security:
            - Notes are decrypted from DB using passphrase, then included in export
            - Entire export is then encrypted with the same passphrase
            - This allows backup restoration with the correct credentials
        """
        # Get the export data (including notes since we have the passphrase)
        export_result = self.export_service.export_settings(
            app_settings=app_settings,
            passphrase=passphrase,
            include_notes=include_notes,
            include_wishlist=include_wishlist,
        )
        if not export_result.success or export_result.data is None:
            return EncryptedExportResult(
                success=False,
                error=export_result.error or "Failed to export settings",
            )

        try:
            # Serialize to JSON
            json_data = json.dumps(export_result.data, separators=(",", ":"))

            # Encrypt
            encryption = CredentialEncryption(passphrase)
            encrypted_data = encryption.encrypt(json_data)
            salt_b64 = encryption.get_salt_b64()

            return EncryptedExportResult(
                success=True,
                salt=salt_b64,
                data=encrypted_data,
            )
        except Exception as e:
            return EncryptedExportResult(
                success=False,
                error=f"Encryption failed: {e}",
            )

    def decrypt_export(
        self,
        salt: str,
        encrypted_data: str,
        passphrase: str,
    ) -> tuple[bool, dict[str, Any] | None, str | None]:
        """
        Decrypt encrypted export data.

        Args:
            salt: Base64-encoded salt
            encrypted_data: Base64-encoded encrypted JSON
            passphrase: Decryption passphrase (email + password)

        Returns:
            Tuple of (success, decrypted_data, error_message)
        """
        try:
            # Recreate encryption with stored salt
            salt_bytes = CredentialEncryption.salt_from_b64(salt)
            encryption = CredentialEncryption(passphrase, salt_bytes)

            # Decrypt
            json_data = encryption.decrypt(encrypted_data)
            data = json.loads(json_data)

            return True, data, None
        except InvalidToken:
            return False, None, "Invalid credentials - decryption failed"
        except json.JSONDecodeError as e:
            return False, None, f"Invalid backup format: {e}"
        except Exception as e:
            return False, None, f"Decryption failed: {e}"

    def import_encrypted(
        self,
        salt: str,
        encrypted_data: str,
        passphrase: str,
        tools: list[str] | None = None,
    ) -> EncryptedImportResult:
        """
        Import settings from encrypted export data.

        Args:
            salt: Base64-encoded salt
            encrypted_data: Base64-encoded encrypted JSON
            passphrase: Decryption passphrase (email + password)
            tools: Optional list of tool names to import

        Returns:
            EncryptedImportResult with import status

        Security:
            - Passphrase is used both for decryption AND for re-encrypting notes
            - Notes content is re-encrypted with the importing user's passphrase
            - This ensures notes remain encrypted in the target database
        """
        # Decrypt
        success, data, error = self.decrypt_export(salt, encrypted_data, passphrase)

        if not success:
            # Check if this is a credentials error
            is_cred_error = bool(error and "Invalid credentials" in error)
            return EncryptedImportResult(
                success=False,
                needs_credentials=is_cred_error,
                error=error,
            )

        if data is None:
            return EncryptedImportResult(
                success=False,
                error="Decrypted data is empty",
            )

        # Import the decrypted data (passphrase used for re-encrypting notes)
        import_result = self.export_service.import_settings(
            data=data,
            tools=tools,
            passphrase=passphrase,
        )

        return EncryptedImportResult(
            success=import_result.success,
            needs_credentials=False,
            imported=import_result.imported,
            warnings=import_result.warnings,
            error=import_result.error,
        )

    def get_encrypted_preview(
        self,
        salt: str,
        encrypted_data: str,
        passphrase: str,
    ) -> tuple[bool, dict[str, Any] | None, str | None]:
        """
        Decrypt and get preview of encrypted export data.

        Args:
            salt: Base64-encoded salt
            encrypted_data: Base64-encoded encrypted JSON
            passphrase: Decryption passphrase

        Returns:
            Tuple of (success, preview_data, error_message)
        """
        success, data, error = self.decrypt_export(salt, encrypted_data, passphrase)

        if not success or data is None:
            return False, None, error

        try:
            preview = self.export_service.get_export_preview(data)
            return True, preview, None
        except Exception as e:
            return False, None, f"Failed to generate preview: {e}"
