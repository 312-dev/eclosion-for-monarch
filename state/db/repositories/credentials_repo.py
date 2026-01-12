"""
Credentials repository with encryption support.
"""

from datetime import datetime

from sqlalchemy.orm import Session

from core.encryption import CredentialEncryption, DecryptionError
from state.db.models import AutomationCredentials, Credentials


class CredentialsRepository:
    """
    Repository for managing encrypted credentials.

    User credentials are encrypted with the user's passphrase.
    Automation credentials are encrypted with a server-derived key.
    """

    def __init__(self, session: Session):
        self.session = session

    # === User Credentials ===

    def exists(self) -> bool:
        """Check if credentials exist."""
        return self.session.query(Credentials).first() is not None

    def save(
        self,
        email: str,
        password: str,
        mfa_secret: str | None,
        passphrase: str,
    ) -> None:
        """
        Encrypt and save user credentials.

        Args:
            email: Monarch Money email
            password: Monarch Money password
            mfa_secret: Optional MFA secret key
            passphrase: User's encryption passphrase
        """
        enc = CredentialEncryption(passphrase=passphrase)
        now = datetime.utcnow()

        # Delete existing and insert new (single row table)
        self.session.query(Credentials).delete()
        self.session.add(
            Credentials(
                id=1,
                salt=enc.get_salt_b64(),
                email_encrypted=enc.encrypt(email),
                password_encrypted=enc.encrypt(password),
                mfa_secret_encrypted=enc.encrypt(mfa_secret) if mfa_secret else None,
                created_at=now,
                updated_at=now,
            )
        )

    def load(self, passphrase: str) -> dict[str, str] | None:
        """
        Load and decrypt user credentials.

        Args:
            passphrase: User's encryption passphrase

        Returns:
            Dict with email, password, mfa_secret or None if not found

        Raises:
            DecryptionError: If passphrase is wrong
        """
        from cryptography.fernet import InvalidToken

        creds = self.session.query(Credentials).first()
        if not creds:
            return None

        try:
            salt = CredentialEncryption.salt_from_b64(creds.salt)
            enc = CredentialEncryption(passphrase=passphrase, salt=salt)

            return {
                "email": enc.decrypt(creds.email_encrypted),
                "password": enc.decrypt(creds.password_encrypted),
                "mfa_secret": (
                    enc.decrypt(creds.mfa_secret_encrypted) if creds.mfa_secret_encrypted else ""
                ),
            }
        except InvalidToken:
            raise DecryptionError("Invalid passphrase or corrupted credentials")

    def verify_passphrase(self, passphrase: str) -> bool:
        """Check if passphrase can decrypt credentials."""
        try:
            result = self.load(passphrase)
            return result is not None
        except DecryptionError:
            return False

    def delete(self) -> None:
        """Delete stored credentials."""
        self.session.query(Credentials).delete()

    # === Automation Credentials ===

    def automation_exists(self) -> bool:
        """Check if automation credentials exist."""
        return self.session.query(AutomationCredentials).first() is not None

    def save_automation(
        self,
        email: str,
        password: str,
        mfa_secret: str | None,
        server_key: str,
        consent_acknowledged: bool = False,
    ) -> None:
        """
        Save automation credentials encrypted with server key.

        Args:
            email: Monarch Money email
            password: Monarch Money password
            mfa_secret: Optional MFA secret
            server_key: Server-derived encryption key
            consent_acknowledged: Whether user consented
        """
        enc = CredentialEncryption(passphrase=server_key)
        now = datetime.utcnow()

        self.session.query(AutomationCredentials).delete()
        self.session.add(
            AutomationCredentials(
                id=1,
                salt=enc.get_salt_b64(),
                email_encrypted=enc.encrypt(email),
                password_encrypted=enc.encrypt(password),
                mfa_secret_encrypted=enc.encrypt(mfa_secret) if mfa_secret else None,
                consent_acknowledged=consent_acknowledged,
                consent_timestamp=now if consent_acknowledged else None,
                created_at=now,
            )
        )

    def load_automation(self, server_key: str) -> dict[str, str] | None:
        """Load automation credentials using server key."""
        from cryptography.fernet import InvalidToken

        creds = self.session.query(AutomationCredentials).first()
        if not creds:
            return None

        try:
            salt = CredentialEncryption.salt_from_b64(creds.salt)
            enc = CredentialEncryption(passphrase=server_key, salt=salt)

            return {
                "email": enc.decrypt(creds.email_encrypted),
                "password": enc.decrypt(creds.password_encrypted),
                "mfa_secret": (
                    enc.decrypt(creds.mfa_secret_encrypted) if creds.mfa_secret_encrypted else ""
                ),
            }
        except InvalidToken:
            return None

    def delete_automation(self) -> None:
        """Delete automation credentials."""
        self.session.query(AutomationCredentials).delete()
