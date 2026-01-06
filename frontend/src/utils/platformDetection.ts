/**
 * Platform Detection Utility
 *
 * Detects the user's operating system for download page recommendations.
 */

export type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

/**
 * Detects the current platform using modern APIs with fallbacks.
 */
export function detectPlatform(): Platform {
  // Server-side rendering guard
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'unknown';
  }

  // Try modern userAgentData API first (Chrome 90+, Edge 90+)
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  if (uaData?.platform) {
    const platform = uaData.platform.toLowerCase();
    if (platform.includes('windows')) return 'windows';
    if (platform.includes('macos') || platform.includes('mac')) return 'macos';
    if (platform.includes('linux')) return 'linux';
  }

  // Fallback to navigator.platform (deprecated but widely supported)
  const platform = navigator.platform?.toLowerCase() ?? '';
  if (platform.includes('win')) return 'windows';
  if (platform.includes('mac')) return 'macos';
  if (platform.includes('linux')) return 'linux';

  // Final fallback: check userAgent string
  const ua = navigator.userAgent?.toLowerCase() ?? '';
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'macos';
  if (ua.includes('linux')) return 'linux';

  return 'unknown';
}

/**
 * Platform display labels.
 */
export const PLATFORM_LABELS: Record<Platform, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  unknown: 'Unknown',
};

/**
 * Platform file extensions for downloads.
 */
export const PLATFORM_EXTENSIONS: Record<Platform, string> = {
  windows: '.exe',
  macos: '.dmg',
  linux: '.AppImage',
  unknown: '',
};
