/**
 * GitHub Release Utility
 *
 * Fetches release information from GitHub for the desktop app downloads.
 */

import type { Platform } from './platformDetection';
import { isBetaEnvironment } from './environment';
import { parseReleaseNotes, generateBetaSummary } from './releaseNotesParser';

const GITHUB_REPO = '312-dev/eclosion';

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
 *
 * Stable builds:
 *   macOS: Eclosion-{VERSION}-arm64.dmg
 *   Windows: Eclosion.Setup.{VERSION}.exe
 *   Linux: Eclosion-{VERSION}.AppImage
 *
 * Beta builds (have "Beta" in name):
 *   macOS: Eclosion.Beta.-{VERSION}-arm64.dmg
 *   Windows: Eclosion.Beta.Setup.{VERSION}.exe
 *   Linux: Eclosion.Beta.-{VERSION}.AppImage
 */
const ASSET_PATTERNS: Record<Platform, RegExp> = {
  macos: /Eclosion(\.Beta)?[.-][\w.-]+-arm64\.dmg$/,
  windows: /Eclosion(\.Beta)?\.Setup\.[\w.-]+\.exe$/,
  linux: /Eclosion(\.Beta)?[.-][\w.-]+\.AppImage$/,
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
 * Checksums are not fetchable from browser environments due to GitHub's CORS policy.
 * This function always returns null. Users can verify checksums manually by
 * downloading SHA256SUMS.txt from the GitHub releases page.
 */
export async function fetchChecksums(_release: GithubRelease): Promise<Checksums | null> {
  // GitHub release asset downloads don't support CORS, so browser fetches always fail.
  // Skip the request entirely to avoid console errors.
  return null;
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

/**
 * Fetches beta releases from GitHub and transforms them to ChangelogEntry format.
 * Used to intersperse beta releases with stable changelog entries.
 */
export async function fetchBetaReleasesAsChangelog(): Promise<
  Array<{
    version: string;
    date: string;
    summary: string;
    sections: {
      added?: string[];
      changed?: string[];
      fixed?: string[];
    };
    isBeta: true;
  }>
> {
  try {
    // Fetch recent releases (includes prereleases)
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=20`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch releases for changelog:', response.status);
      return [];
    }

    const releases: (GithubRelease & { draft: boolean })[] = await response.json();

    // Filter to only beta prereleases (non-draft)
    const betaReleases = releases.filter((r) => r.prerelease && !r.draft);

    return betaReleases.map((release) => {
      const version = getVersionFromTag(release.tag_name);
      const date = new Date(release.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Parse release notes into sections
      const sections = parseReleaseNotes(release.body);

      // Generate summary from first line or sections
      const summary = generateBetaSummary(release.body, sections);

      return {
        version,
        date,
        summary,
        sections,
        isBeta: true as const,
      };
    });
  } catch (error) {
    console.error('Error fetching beta releases:', error);
    return [];
  }
}

