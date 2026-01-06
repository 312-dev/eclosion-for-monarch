/**
 * GitHub Release Utility
 *
 * Fetches release information from GitHub for the desktop app downloads.
 */

import type { Platform } from './platformDetection';

const GITHUB_REPO = 'GraysonCAdams/eclosion-for-monarch';

export interface GithubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface GithubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  assets: GithubAsset[];
  html_url: string;
}

/**
 * Fetches the latest release from GitHub.
 * Returns null if the request fails.
 */
export async function fetchLatestRelease(): Promise<GithubRelease | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch latest release:', response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching latest release:', error);
    return null;
  }
}

/**
 * Asset name patterns for each platform.
 * macOS: Eclosion-{VERSION}.dmg (universal binary)
 * Windows: Eclosion.Setup.{VERSION}.exe
 * Linux: Eclosion-{VERSION}.AppImage
 */
const ASSET_PATTERNS: Record<Platform, RegExp> = {
  macos: /Eclosion-[\d.]+\.dmg$/,
  windows: /Eclosion\.Setup\.[\d.]+\.exe$/,
  linux: /Eclosion-[\d.]+\.AppImage$/,
  unknown: /^$/, // Never matches
};

/**
 * Gets the download URL for a specific platform from a release.
 * Returns null if no matching asset is found.
 */
export function getDownloadUrl(release: GithubRelease, platform: Platform): string | null {
  if (platform === 'unknown') return null;

  const pattern = ASSET_PATTERNS[platform];
  const asset = release.assets.find((a) => pattern.test(a.name));

  return asset?.browser_download_url ?? null;
}

/**
 * Gets all platform download URLs from a release.
 */
export function getAllDownloadUrls(
  release: GithubRelease
): Record<Exclude<Platform, 'unknown'>, string | null> {
  return {
    windows: getDownloadUrl(release, 'windows'),
    macos: getDownloadUrl(release, 'macos'),
    linux: getDownloadUrl(release, 'linux'),
  };
}

/**
 * Extracts the version number from a release tag (removes 'v' prefix).
 */
export function getVersionFromTag(tagName: string): string {
  return tagName.replace(/^v/, '');
}

/**
 * Formats file size in human-readable format.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Gets the asset for a specific platform from a release.
 */
export function getAssetForPlatform(
  release: GithubRelease,
  platform: Platform
): GithubAsset | null {
  if (platform === 'unknown') return null;

  const pattern = ASSET_PATTERNS[platform];
  return release.assets.find((a) => pattern.test(a.name)) ?? null;
}
