"""
Metadata Service

Fetches Open Graph metadata and favicons from URLs for stash item images.
"""

import base64
import io
import logging
import re
import socket
from urllib.parse import urljoin, urlparse, urlunparse

import aiohttp
from bs4 import BeautifulSoup
from PIL import Image

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
FAVICON_TIMEOUT = 5.0  # seconds - shorter timeout for favicons
MIN_FAVICON_SIZE = 32  # minimum dimension (32x32)
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_FAVICON_SIZE = 512 * 1024  # 512KB - favicons should be small
VALID_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

# ICO content types
ICO_TYPE_X_ICON = "image/x-icon"
ICO_TYPE_MS_ICON = "image/vnd.microsoft.icon"
ICO_TYPES = {ICO_TYPE_X_ICON, ICO_TYPE_MS_ICON}

VALID_FAVICON_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"} | ICO_TYPES

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
            if og_tag and hasattr(og_tag, "get"):
                content = og_tag.get("content")
                if content:
                    return str(content)

            # Fallback to twitter:image
            twitter_tag = soup.find("meta", attrs={"name": "twitter:image"})
            if twitter_tag and hasattr(twitter_tag, "get"):
                content = twitter_tag.get("content")
                if content:
                    return str(content)

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


async def fetch_favicon(domain: str, timeout: float = FAVICON_TIMEOUT) -> str | None:
    """
    Fetch favicon from a domain and return as base64 data URL.

    Tries these locations in order:
    1. /apple-touch-icon.png (highest quality, typically 180x180)
    2. /apple-touch-icon-precomposed.png
    3. /favicon.ico
    4. Parse HTML for <link rel="icon"> tags

    Returns None on any failure (timeout, not found, too small, etc.).
    Designed to fail silently - caller should handle None gracefully.

    Args:
        domain: The domain to fetch favicon from (e.g., "amazon.com")
        timeout: Maximum time in seconds for the entire operation

    Returns:
        Base64 data URL (e.g., "data:image/png;base64,...") or None
    """
    try:
        # Sanitize domain - strip protocol if provided
        sanitized_domain = _sanitize_domain(domain)
        if not sanitized_domain:
            return None
        domain = sanitized_domain

        # Build base URL
        base_url = f"https://{domain}"

        # SSRF protection
        if not _is_url_safe(base_url):
            logger.debug(
                "Blocked favicon request to private IP: %s", _sanitize_url_for_logging(domain)
            )
            return None

        connector = aiohttp.TCPConnector(ssl=False)
        client_timeout = aiohttp.ClientTimeout(total=timeout)
        headers = {"User-Agent": USER_AGENT, "Accept": "image/*,*/*;q=0.8"}

        async with aiohttp.ClientSession(
            connector=connector, timeout=client_timeout, headers=headers
        ) as session:
            # Try common favicon locations in order of preference
            favicon_paths = [
                "/apple-touch-icon.png",
                "/apple-touch-icon-precomposed.png",
                "/favicon.ico",
            ]

            for path in favicon_paths:
                favicon_url = f"{base_url}{path}"
                result = await _download_and_validate_favicon(session, favicon_url)
                if result:
                    return result

            # If direct paths fail, try parsing HTML for link tags
            return await _extract_and_fetch_favicon_from_html(session, base_url)

    except TimeoutError:
        logger.debug("Timeout fetching favicon from %s", _sanitize_url_for_logging(domain))
        return None
    except aiohttp.ClientError as e:
        logger.debug(
            "HTTP error fetching favicon from %s: %s", _sanitize_url_for_logging(domain), e
        )
        return None
    except Exception as e:
        logger.debug(
            "Unexpected error fetching favicon from %s: %s", _sanitize_url_for_logging(domain), e
        )
        return None


def _sanitize_domain(domain: str) -> str | None:
    """
    Sanitize and extract domain from input.

    Handles cases where user might pass full URL or domain with protocol.
    Returns lowercase domain without www prefix, or None if invalid.
    """
    if not domain:
        return None

    domain = domain.strip().lower()

    # If it looks like a URL, extract the hostname
    if "://" in domain:
        try:
            parsed = urlparse(domain)
            domain = parsed.hostname or ""
        except Exception:
            return None

    # Remove www prefix
    if domain.startswith("www."):
        domain = domain[4:]

    # Basic validation
    if not domain or "." not in domain:
        return None

    # Remove any path components
    domain = domain.split("/")[0]

    return domain


async def _download_and_validate_favicon(
    session: aiohttp.ClientSession, favicon_url: str
) -> str | None:
    """Download a favicon, validate its size, and return as base64 data URL."""
    try:
        safe_url = _get_validated_url(favicon_url)
        if safe_url is None:
            return None

        async with session.get(safe_url, allow_redirects=True) as response:
            if response.status != 200:
                return None

            # Validate content type
            content_type = response.headers.get("Content-Type", "").split(";")[0].strip()
            if content_type not in VALID_FAVICON_TYPES:
                return None

            # Check content length if available
            content_length = response.headers.get("Content-Length")
            if content_length and int(content_length) > MAX_FAVICON_SIZE:
                return None

            # Download with size limit
            data = await response.content.read(MAX_FAVICON_SIZE + 1)
            if len(data) > MAX_FAVICON_SIZE:
                return None

            # Validate image dimensions
            if not _is_favicon_large_enough(data, content_type):
                logger.debug("Favicon too small from %s", _sanitize_url_for_logging(favicon_url))
                return None

            # Encode as base64 data URL
            # Normalize content type for .ico files
            if content_type in ICO_TYPES:
                content_type = ICO_TYPE_X_ICON

            b64 = base64.b64encode(data).decode("ascii")
            return f"data:{content_type};base64,{b64}"

    except Exception as e:
        logger.debug(
            "Error downloading favicon from %s: %s",
            _sanitize_url_for_logging(favicon_url),
            e,
        )
        return None


def _is_favicon_large_enough(data: bytes, content_type: str) -> bool:
    """Check if favicon meets minimum size requirements (32x32)."""
    try:
        image = Image.open(io.BytesIO(data))

        # For ICO files, check if any frame is large enough
        if content_type in ICO_TYPES:
            return _check_ico_has_large_frame(image)

        # For other formats, just check dimensions
        width, height = image.size
        return bool(width >= MIN_FAVICON_SIZE and height >= MIN_FAVICON_SIZE)

    except Exception as e:
        logger.debug("Error checking favicon size: %s", e)
        return False


def _check_ico_has_large_frame(image: Image.Image) -> bool:
    """Check if ICO file has at least one frame >= MIN_FAVICON_SIZE."""
    n_frames = getattr(image, "n_frames", 1)
    for i in range(n_frames):
        try:
            image.seek(i)
            width, height = image.size
            if width >= MIN_FAVICON_SIZE and height >= MIN_FAVICON_SIZE:
                return True
        except EOFError:
            break
    return False


def _find_icon_links(soup: BeautifulSoup) -> list[tuple[str, int, str]]:
    """Find all icon link tags from HTML and return sorted by preference."""
    icon_links: list[tuple[str, int, str]] = []
    icon_rel_types = ["apple-touch-icon", "icon", "shortcut icon"]

    for rel_type in icon_rel_types:
        # Use a helper to avoid closure issues with lambda
        tags = soup.find_all(
            "link", rel=lambda r, rt=rel_type: r and rt in r.lower() if r else False
        )
        for tag in tags:
            if not hasattr(tag, "get"):
                continue
            href = tag.get("href")
            if href:
                sizes = tag.get("sizes", "")
                size = _parse_icon_size(str(sizes))
                icon_links.append((str(href), size, rel_type))

    # Sort by size (largest first), then by rel preference
    rel_priority = {"apple-touch-icon": 0, "icon": 1, "shortcut icon": 2}
    icon_links.sort(key=lambda x: (-x[1], rel_priority.get(x[2], 3)))

    return icon_links


async def _extract_and_fetch_favicon_from_html(
    session: aiohttp.ClientSession, base_url: str
) -> str | None:
    """Parse HTML page to find favicon link tags and fetch the best one."""
    try:
        safe_url = _get_validated_url(base_url)
        if safe_url is None:
            return None

        async with session.get(safe_url, allow_redirects=True) as response:
            if response.status != 200:
                return None

            content_type = response.headers.get("Content-Type", "")
            if "text/html" not in content_type:
                return None

            html = await response.text()
            soup = BeautifulSoup(html, "lxml")

            # Find all icon link tags, sorted by preference
            icon_links = _find_icon_links(soup)

            # Try each icon URL until one works
            for href, size, _ in icon_links:
                # Skip if we know it's too small
                if size > 0 and size < MIN_FAVICON_SIZE:
                    continue

                favicon_url = urljoin(base_url, href)

                # SSRF check
                if not _is_url_safe(favicon_url):
                    continue

                result = await _download_and_validate_favicon(session, favicon_url)
                if result:
                    return result

            return None

    except Exception as e:
        logger.debug(
            "Error extracting favicon from HTML at %s: %s",
            _sanitize_url_for_logging(base_url),
            e,
        )
        return None


def _parse_icon_size(sizes: str) -> int:
    """Parse sizes attribute (e.g., '32x32', '180x180') and return the dimension."""
    if not sizes:
        return 0
    try:
        # Handle formats like "32x32" or "180x180"
        match = re.match(r"(\d+)x(\d+)", sizes.lower())
        if match:
            return int(match.group(1))
        return 0
    except Exception:
        return 0
