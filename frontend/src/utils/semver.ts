/**
 * Semver Utilities
 *
 * Functions for parsing and comparing semantic version strings.
 */

/**
 * Parse a semver string into comparable parts.
 * Returns [major, minor, patch] as numbers, or null if invalid.
 * Handles versions with or without 'v' prefix and with prerelease suffixes.
 */
export function parseSemver(version: string): [number, number, number] | null {
  // Remove 'v' prefix and any beta/rc suffix
  const clean = version.replace(/^v/, '').split('-')[0] ?? '';
  const parts = clean.split('.').map(Number);
  if (parts.length >= 3 && parts.every((p) => !Number.isNaN(p))) {
    const [major, minor, patch] = parts;
    if (major !== undefined && minor !== undefined && patch !== undefined) {
      return [major, minor, patch];
    }
  }
  return null;
}

/**
 * Compare two semver versions.
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 * Only compares major.minor.patch, ignoring prerelease suffixes.
 */
export function compareSemver(a: string, b: string): number {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);
  if (!parsedA || !parsedB) return 0;

  // Compare major, minor, patch in order
  const [majorA, minorA, patchA] = parsedA;
  const [majorB, minorB, patchB] = parsedB;

  if (majorA < majorB) return -1;
  if (majorA > majorB) return 1;
  if (minorA < minorB) return -1;
  if (minorA > minorB) return 1;
  if (patchA < patchB) return -1;
  if (patchA > patchB) return 1;

  return 0;
}

/**
 * Check if version a is less than or equal to version b.
 */
export function isVersionLte(a: string, b: string): boolean {
  return compareSemver(a, b) <= 0;
}

/**
 * Check if version a is greater than version b.
 */
export function isVersionGt(a: string, b: string): boolean {
  return compareSemver(a, b) > 0;
}
