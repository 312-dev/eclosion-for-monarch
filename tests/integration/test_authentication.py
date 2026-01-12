"""
Integration tests for authentication.

Tests that authentication with Monarch works correctly.
"""

import os

import pytest
from monarchmoney import MonarchMoney


@pytest.mark.integration
@pytest.mark.asyncio
async def test_authentication_succeeds(monarch_client):
    """Test that we successfully authenticated."""
    # If we got here, the fixture already authenticated successfully
    # Verify we have a valid token
    assert monarch_client.token is not None, "Should have auth token after login"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_authenticated_request_works(monarch_client):
    """Test that authenticated requests work."""
    # Make a simple API call to verify auth is working
    categories = await monarch_client.get_transaction_categories()
    assert categories is not None, "Should be able to make authenticated requests"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_fresh_login():
    """Test a fresh login (separate from fixture)."""
    email = os.environ.get("MONARCH_EMAIL")
    password = os.environ.get("MONARCH_PASSWORD")
    mfa_secret = os.environ.get("MFA_SECRET_KEY", "")

    if not email or not password:
        pytest.skip("MONARCH_EMAIL and MONARCH_PASSWORD must be set")

    client = MonarchMoney()
    await client.login(
        email=email,
        password=password,
        mfa_secret_key=mfa_secret if mfa_secret else None,
    )

    assert client.token is not None, "Fresh login should succeed"

    # Verify can make requests
    categories = await client.get_transaction_categories()
    assert categories is not None, "Should be able to make requests after fresh login"
