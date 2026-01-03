---
id: security
title: Security
sidebar_label: Security
sidebar_position: 2
---

# Security

How Eclosion protects your Monarch Money credentials.

## Overview

Eclosion requires your Monarch Money email and password to access your financial data. Since Monarch Money does not offer OAuth or API tokens for third-party integrations, direct credential storage is necessary.

To protect your credentials, Eclosion uses **user-controlled encryption**:
- Your credentials are encrypted with a passphrase that **only you know**
- The server cannot decrypt your credentials without your passphrase
- You can self-host the application for maximum control

## Encryption Details

### Algorithm

- **Encryption**: Fernet (AES-128-CBC with HMAC-SHA256)
- **Key Derivation**: PBKDF2 with SHA-256, 480,000 iterations
- **Salt**: 16 bytes (128 bits), randomly generated per user

### How It Works

1. When you first log in with your Monarch credentials, you create an **encryption passphrase**
2. Your passphrase is used to derive an encryption key using PBKDF2 (a standard key derivation function)
3. Your Monarch email, password, and MFA secret (if applicable) are encrypted with this key
4. The encrypted data and a random salt are stored on the server
5. Your passphrase is **never stored** — it exists only in memory during your session

### Passphrase Requirements

Your encryption passphrase must meet these requirements:
- Minimum 12 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&* etc.)

### File Permissions

The encrypted credentials file is stored with restrictive file permissions:
- `0600` (owner read/write only)
- Only the server process can read the file

## What This Means For You

### The Server Cannot Access Your Credentials

Even if the server is compromised, your Monarch credentials remain encrypted. An attacker would need both:
1. Access to the encrypted credentials file
2. Your passphrase (which is never stored)

### Forgetting Your Passphrase

If you forget your passphrase:
- Your encrypted credentials cannot be recovered
- You'll need to re-enter your Monarch credentials and create a new passphrase
- This is by design — it ensures only you can access your credentials

### Session Security

- Your passphrase is kept in server memory only during active sessions
- When the server restarts, you'll need to re-enter your passphrase
- You can manually lock your session at any time

## Self-Hosting

For maximum security and control, you can run Eclosion on your own infrastructure:

1. Your credentials never leave your own server
2. You control all aspects of the deployment
3. You can audit the open-source code

See [Self-Hosting](/self-hosting/overview) for deployment instructions.

## Why Not OAuth?

Monarch Money does not currently provide:
- OAuth authentication for third-party apps
- Personal access tokens
- API keys

Direct credential authentication is the only available method. Eclosion uses strong encryption to mitigate the risks of credential storage.

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:
1. Do not disclose publicly until addressed
2. Email details to the project maintainers
3. Allow reasonable time for a fix

## Technical Implementation

### Relevant Files

- `core/encryption.py` — Encryption utilities
- `state/state_manager.py` — CredentialsManager class
- `api.py` — Authentication endpoints

### API Endpoints

- `POST /auth/login` — Validate Monarch credentials (does not store)
- `POST /auth/set-passphrase` — Encrypt and save credentials with passphrase
- `POST /auth/unlock` — Decrypt credentials with passphrase
- `POST /auth/lock` — Clear session (keeps encrypted credentials)
- `POST /auth/logout` — Clear both session and stored credentials
- `GET /security/status` — Get security configuration info
