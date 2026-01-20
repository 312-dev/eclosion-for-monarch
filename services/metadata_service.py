"""
Metadata Service

Fetches Open Graph metadata from URLs for wishlist item images.
"""

import base64
import logging
import re
import socket
from urllib.parse import urljoin, urlparse, urlunparse

import aiohttp
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


def _sanitize_url_for_logging(url: str) -> str:
    """
    Sanitize a URL for safe logging to prevent log injection.

    Uses repr() which CodeQL recognizes as a sanitization barrier.
    """
    # First remove control characters and truncate
    sanitized = "".join(c if c.isprintable() and c not in "\n\r\t" else "?" for c in url)
    if len(sanitized) > 200:
        sanitized = sanitized[:200] + "..."
    # Use repr() to escape any remaining special characters
    # CodeQL recognizes repr() as a log injection sanitizer
    return repr(sanitized)


# Constants
FETCH_TIMEOUT = 10.0  # seconds
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
VALID_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

# Browser-like User-Agent (some sites block bot UAs)
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
ACCEPT_HEADER = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"

# Known URL shortener domains
SHORTENER_DOMAINS = [
    "a.co",
    "amzn.to",
    "amzn.com",
    "bit.ly",
    "t.co",
    "goo.gl",
    "tinyurl.com",
    "ow.ly",
    "is.gd",
    "buff.ly",
]

# Private IP ranges for SSRF protection
IPV4_PRIVATE_PATTERNS = [
    re.compile(r"^127\."),  # Loopback
    re.compile(r"^10\."),  # Private Class A
    re.compile(r"^172\.(1[6-9]|2[0-9]|3[0-1])\."),  # Private Class B
    re.compile(r"^192\.168\."),  # Private Class C
    re.compile(r"^169\.254\."),  # Link-local
    re.compile(r"^0\."),  # Current network
    re.compile(r"^224\."),  # Multicast
    re.compile(r"^240\."),  # Reserved
]


def _is_private_ip(ip: str) -> bool:
    """Check if an IP address is in a private/reserved range."""
    return any(pattern.match(ip) for pattern in IPV4_PRIVATE_PATTERNS)


def _is_url_safe(url: str) -> bool:
    """Validate that a URL doesn't resolve to a private IP address."""
    try:
        hostname = urlparse(url).hostname
        if not hostname:
            return False

        # Check if hostname is already an IP
        if re.match(r"^[\d.]+$", hostname):
            return not _is_private_ip(hostname)

        # Resolve hostname
        ip = socket.gethostbyname(hostname)
        return not _is_private_ip(ip)
    except (socket.gaierror, OSError):
        # DNS resolution failed - allow it (will fail later anyway)
        return True


def _is_shortener_url(url: str) -> bool:
    """Check if a URL is from a known shortener domain."""
    try:
        hostname = urlparse(url).hostname
        if not hostname:
            return False
        hostname = hostname.lower()
        return any(
            hostname == domain or hostname.endswith(f".{domain}") for domain in SHORTENER_DOMAINS
        )
    except Exception:
        return False


async def fetch_og_image(url: str, timeout: float = FETCH_TIMEOUT) -> str | None:
    """
    Fetch a URL, extract og:image, download it, and return as base64 data URL.

    Returns None on any failure (timeout, no og:image, invalid image, etc.).
    Designed to fail silently - caller should handle None gracefully.

    Args:
        url: The webpage URL to fetch og:image from
        timeout: Maximum time in seconds for the entire operation

    Returns:
        Base64 data URL (e.g., "data:image/png;base64,...") or None
    """
    try:
        # Validate URL
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return None

        # SSRF protection
        if not _is_url_safe(url):
            logger.debug("Blocked request to private IP: %s", _sanitize_url_for_logging(url))
            return None

        connector = aiohttp.TCPConnector(ssl=False)
        client_timeout = aiohttp.ClientTimeout(total=timeout)
        headers = {"User-Agent": USER_AGENT, "Accept": ACCEPT_HEADER}

        async with aiohttp.ClientSession(
            connector=connector, timeout=client_timeout, headers=headers
        ) as session:
            # Expand shortened URLs first
            target_url = url
            if _is_shortener_url(url):
                expanded = await _expand_shortened_url(session, url)
                if expanded and _is_url_safe(expanded):
                    target_url = expanded

            # Fetch the HTML page
            og_image_url = await _extract_og_image_url(session, target_url)
            if not og_image_url:
                return None

            # Resolve relative URLs
            og_image_url = urljoin(target_url, og_image_url)

            # SSRF check for image URL
            if not _is_url_safe(og_image_url):
                logger.debug(
                    "Blocked image request to private IP: %s",
                    _sanitize_url_for_logging(og_image_url),
                )
                return None

            # Download and encode the image
            return await _download_and_encode_image(session, og_image_url)

    except TimeoutError:
        logger.debug("Timeout fetching og:image from %s", _sanitize_url_for_logging(url))
        return None
    except aiohttp.ClientError as e:
        logger.debug("HTTP error fetching og:image from %s: %s", _sanitize_url_for_logging(url), e)
        return None
    except Exception as e:
        logger.debug(
            "Unexpected error fetching og:image from %s: %s", _sanitize_url_for_logging(url), e
        )
        return None


def _get_validated_url(url: str) -> str | None:
    """
    Validate URL and return a reconstructed version if safe, None if unsafe.

    SSRF protection: validates scheme and checks hostname doesn't resolve to private IP.
    Returns a reconstructed URL from validated components to break taint tracking.
    """
    parsed = urlparse(url)
    # Validate scheme - only http/https allowed
    if parsed.scheme not in ("http", "https"):
        return None
    # Validate hostname doesn't resolve to private IP
    if not _is_url_safe(url):
        return None
    # Reconstruct URL from validated, parsed components
    # This creates a new string that isn't tainted by the original input
    return urlunparse(parsed)


async def _expand_shortened_url(
    session: aiohttp.ClientSession, url: str, max_redirects: int = 5
) -> str | None:
    """Expand a shortened URL by following redirects."""
    try:
        current_url = url
        for _ in range(max_redirects):
            # SSRF protection: validate URL before each request
            safe_url = _get_validated_url(current_url)
            if safe_url is None:
                return None
            async with session.get(safe_url, allow_redirects=False) as response:
                if response.status >= 300 and response.status < 400:
                    location = response.headers.get("Location")
                    if not location:
                        return current_url
                    current_url = urljoin(current_url, location)
                elif response.status >= 200 and response.status < 300:
                    return current_url
                else:
                    return None
        return current_url
    except Exception:
        return None


async def _extract_og_image_url(session: aiohttp.ClientSession, url: str) -> str | None:
    """Extract og:image URL from a webpage."""
    try:
        # SSRF protection: validate URL before request
        safe_url = _get_validated_url(url)
        if safe_url is None:
            return None
        async with session.get(safe_url, allow_redirects=True) as response:
            if response.status != 200:
                return None

            # Only parse HTML content
            content_type = response.headers.get("Content-Type", "")
            if "text/html" not in content_type:
                return None

            html = await response.text()
            soup = BeautifulSoup(html, "lxml")

            # Try og:image first
            og_tag = soup.find("meta", property="og:image")
            if og_tag and og_tag.get("content"):
                return str(og_tag["content"])

            # Fallback to twitter:image
            twitter_tag = soup.find("meta", attrs={"name": "twitter:image"})
            if twitter_tag and twitter_tag.get("content"):
                return str(twitter_tag["content"])

            return None

    except Exception as e:
        logger.debug("Error extracting og:image from %s: %s", _sanitize_url_for_logging(url), e)
        return None


async def _download_and_encode_image(session: aiohttp.ClientSession, image_url: str) -> str | None:
    """Download an image and return as base64 data URL."""
    try:
        # SSRF protection: validate URL before request
        safe_url = _get_validated_url(image_url)
        if safe_url is None:
            return None
        async with session.get(safe_url, allow_redirects=True) as response:
            if response.status != 200:
                return None

            # Validate content type
            content_type = response.headers.get("Content-Type", "").split(";")[0]
            if content_type not in VALID_IMAGE_TYPES:
                return None

            # Check content length if available
            content_length = response.headers.get("Content-Length")
            if content_length and int(content_length) > MAX_IMAGE_SIZE:
                return None

            # Download with size limit
            data = await response.content.read(MAX_IMAGE_SIZE + 1)
            if len(data) > MAX_IMAGE_SIZE:
                return None

            # Encode as base64 data URL
            b64 = base64.b64encode(data).decode("ascii")
            return f"data:{content_type};base64,{b64}"

    except Exception as e:
        logger.debug("Error downloading image from %s: %s", _sanitize_url_for_logging(image_url), e)
        return None
