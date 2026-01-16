/**
 * Release Notes Parsing Utilities
 *
 * Parses GitHub release notes into structured changelog format.
 */

import { getVersionFromTag, type GithubRelease } from './githubRelease';
import {
  parseReleaseNotes,
  generateBetaSummary,
  type ChangelogSections,
} from './releaseNotesParser';

const GITHUB_REPO = '312-dev/eclosion';

export interface BetaChangelogEntry {
  version: string;
  date: string;
  summary: string;
  sections: ChangelogSections;
  isBeta: true;
}

/**
 * Fetches beta releases from GitHub and transforms them to ChangelogEntry format.
 * Used to intersperse beta releases with stable changelog entries.
 */
export async function fetchBetaReleasesAsChangelog(): Promise<BetaChangelogEntry[]> {
  try {
    // Fetch recent releases (includes prereleases)
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=20`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

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
