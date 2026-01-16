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
  if (typeof globalThis.window === 'undefined' || typeof navigator === 'undefined') {
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

/**
 * System requirements for each platform.
 */
export interface SystemRequirements {
  os: string;
  arch: string;
  ram: string;
  disk: string;
  notes?: string;
}

export const PLATFORM_REQUIREMENTS: Record<Exclude<Platform, 'unknown'>, SystemRequirements> = {
  macos: {
    os: 'macOS 11 (Big Sur) or later',
    arch: 'Intel or Apple Silicon',
    ram: '4 GB RAM',
    disk: '200 MB disk space',
  },
  windows: {
    os: 'Windows 10 (64-bit) or later',
    arch: 'x64 processor',
    ram: '4 GB RAM',
    disk: '200 MB disk space',
  },
  linux: {
    os: 'Ubuntu 20.04, Debian 10, Fedora 32, or equivalent',
    arch: 'x64 processor',
    ram: '4 GB RAM',
    disk: '200 MB disk space',
    notes: 'AppImage format - works on most distributions',
  },
};
