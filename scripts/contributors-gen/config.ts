/**
 * Configuration for the contributor generator
 */

// GitHub repository info
export const REPO_OWNER = 'GraysonCAdams';
export const REPO_NAME = 'eclosion';

// Default ideator when no origin issue is specified
export const DEFAULT_IDEATOR_USERNAME = 'GraysonCAdams';

// Cache duration (7 days)
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Bot patterns to exclude from contributors
export const BOT_PATTERNS: (string | RegExp)[] = [
  // Dependency bots
  'dependabot',
  'dependabot[bot]',
  'renovate',
  'renovate[bot]',

  // GitHub automation
  'github-actions[bot]',
  'github-actions',

  // Generic bot suffix
  /\[bot\]$/i,

  // AI assistants
  /^claude$/i,
  /anthropic/i,
  'noreply@anthropic.com',

  // Common noreply addresses
  /noreply@github\.com$/i,
];

/**
 * Check if a username or email belongs to a bot
 */
export function isBot(username: string, email: string): boolean {
  const combined = `${username} ${email}`.toLowerCase();

  return BOT_PATTERNS.some((pattern) => {
    if (typeof pattern === 'string') {
      return combined.includes(pattern.toLowerCase());
    }
    return pattern.test(combined);
  });
}

/**
 * Normalize email for deduplication
 * Strips common prefixes and lowercases
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
