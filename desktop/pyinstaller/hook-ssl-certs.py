"""
PyInstaller runtime hook to configure SSL certificates.

When running as a PyInstaller bundle, Python can't find the system's CA certificates.
This hook sets SSL_CERT_FILE to point to the bundled certifi certificates.
"""

import os
import sys


def _get_cert_path():
    """Get the path to the bundled CA certificates."""
    if getattr(sys, "frozen", False):
        # Running as PyInstaller bundle
        bundle_dir = sys._MEIPASS  # type: ignore[attr-defined]
        cert_path = os.path.join(bundle_dir, "certifi", "cacert.pem")
        if os.path.exists(cert_path):
            return cert_path
    return None


# Set SSL certificate environment variables before any SSL connections
cert_path = _get_cert_path()
if cert_path:
    os.environ["SSL_CERT_FILE"] = cert_path
    os.environ["REQUESTS_CA_BUNDLE"] = cert_path
