/**
 * GitHub Release Utility
 *
 * Fetches release information from GitHub for the desktop app downloads.
 */

import type { Platform } from './platformDetection';
import { isBetaEnvironment } from './environment';

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
  body: string; // Release notes in markdown
  prerelease: boolean;
}

/**
 * Fetches the latest release from GitHub.
 * On beta environments, fetches the latest prerelease.
 * On stable environments, fetches the latest non-prerelease.
 * Returns null if the request fails.
 */
export async function fetchLatestRelease(): Promise<GithubRelease | null> {
  try {
    const isBeta = isBetaEnvironment();

    if (isBeta) {
      // Fetch all releases and find the latest prerelease
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch releases:', response.status);
        return null;
      }

      const releases: (GithubRelease & { prerelease: boolean; draft: boolean })[] =
        await response.json();

      // Find the first prerelease that isn't a draft
      const latestPrerelease = releases.find((r) => r.prerelease && !r.draft);
      return latestPrerelease ?? null;
    }

    // Stable: use /releases/latest which returns only non-prerelease, non-draft
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
 * macOS: Eclosion-{VERSION}-arm64.dmg (ARM64 build)
 * Windows: Eclosion.Setup.{VERSION}.exe
 * Linux: Eclosion-{VERSION}.AppImage
 */
const ASSET_PATTERNS: Record<Platform, RegExp> = {
  macos: /Eclosion-[\d.]+-arm64\.dmg$/,
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

/**
 * Parsed checksums mapping filename to SHA256 hash.
 */
export type Checksums = Record<string, string>;

/**
 * Fetches and parses the SHA256SUMS.txt file from a release.
 * Returns null if the file is not found or fails to parse.
 */
export async function fetchChecksums(release: GithubRelease): Promise<Checksums | null> {
  try {
    const checksumAsset = release.assets.find((a) => a.name === 'SHA256SUMS.txt');
    if (!checksumAsset) {
      return null;
    }

    const response = await fetch(checksumAsset.browser_download_url);
    if (!response.ok) {
      console.error('Failed to fetch checksums:', response.status);
      return null;
    }

    const text = await response.text();
    const checksums: Checksums = {};

    // Parse the checksum file (format: "hash  filename" or "hash *filename")
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Match "hash  filename" or "hash *filename" (sha256sum/shasum format)
      const pattern = /^([a-f0-9]{64})\s+\*?(.+)$/i;
      const match = pattern.exec(trimmed);
      if (match?.[1] && match[2]) {
        const hash = match[1];
        const filename = match[2];
        checksums[filename] = hash.toLowerCase();
      }
    }

    return Object.keys(checksums).length > 0 ? checksums : null;
  } catch (error) {
    console.error('Error fetching checksums:', error);
    return null;
  }
}

/**
 * Gets the checksum for a specific platform's asset.
 * Returns null if checksums are not available or the asset is not found.
 */
export function getChecksumForPlatform(
  checksums: Checksums | null,
  release: GithubRelease,
  platform: Platform
): string | null {
  if (!checksums || platform === 'unknown') return null;

  const asset = getAssetForPlatform(release, platform);
  if (!asset) return null;

  return checksums[asset.name] ?? null;
}

/**
 * Formats a published date in human-readable format.
 * Example: "January 5, 2026"
 */
export function formatPublishedDate(publishedAt: string): string {
  const date = new Date(publishedAt);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Gets relative time from a published date.
 * Example: "2 days ago", "1 week ago"
 */
export function getRelativeTime(publishedAt: string): string {
  const date = new Date(publishedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return '1 month ago';
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
}
