/**
 * GitHub API client for fetching user info and issue authors
 */

import { Octokit } from '@octokit/rest';
import { REPO_OWNER, REPO_NAME, isBot } from './config.js';
import type { Contributor, Cache, CacheEntry } from './types.js';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Sleep utility for rate limit handling
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with rate limit retry logic
 */
async function withRateLimit<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error as {
        status?: number;
        response?: { headers?: Record<string, string> };
      };
      if (err.status === 403) {
        const resetHeader = err.response?.headers?.['x-ratelimit-reset'];
        if (resetHeader) {
          const resetTime = parseInt(resetHeader, 10) * 1000;
          const waitTime = Math.max(resetTime - Date.now() + 1000, 5000);
          console.log(`Rate limited. Waiting ${Math.round(waitTime / 1000)}s...`);
          await sleep(waitTime);
          continue;
        }
      }
      if (i === retries - 1) {
        throw error;
      }
      await sleep(1000 * (i + 1));
    }
  }
  return null;
}

/**
 * Get the author of a GitHub issue
 */
export async function getIssueAuthor(
  issueNumber: number
): Promise<Contributor | null> {
  try {
    const result = await withRateLimit(async () => {
      const { data } = await octokit.issues.get({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        issue_number: issueNumber,
      });
      return data;
    });

    if (!result || !result.user) {
      return null;
    }

    // Skip if author is a bot
    if (isBot(result.user.login, '')) {
      return null;
    }

    return {
      username: result.user.login,
      avatarUrl: result.user.avatar_url,
      profileUrl: result.user.html_url,
      commits: 0,
    };
  } catch (error) {
    console.warn(`Failed to fetch issue #${issueNumber}:`, error);
    return null;
  }
}

/**
 * Extract username from GitHub noreply email
 * Format: {user_id}+{username}@users.noreply.github.com
 * or: {username}@users.noreply.github.com
 */
function extractUsernameFromNoreply(email: string): string | null {
  const noreplyMatch = email.match(
    /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i
  );
  return noreplyMatch ? noreplyMatch[1] : null;
}

/**
 * Try to find a GitHub user by their commit email
 */
export async function getUserByEmail(
  email: string,
  cache: Cache
): Promise<CacheEntry | null> {
  // Check cache first
  const cached = cache.users[email];
  if (cached) {
    return cached;
  }

  try {
    // First, check if this is a GitHub noreply email
    const noreplyUsername = extractUsernameFromNoreply(email);
    if (noreplyUsername) {
      const userResult = await withRateLimit(async () => {
        try {
          const { data } = await octokit.users.getByUsername({
            username: noreplyUsername,
          });
          return data;
        } catch {
          return null;
        }
      });

      if (userResult) {
        const entry: CacheEntry = {
          email,
          username: userResult.login,
          avatarUrl: userResult.avatar_url,
          profileUrl: userResult.html_url,
          fetchedAt: new Date().toISOString(),
        };
        cache.users[email] = entry;
        return entry;
      }
    }

    // GitHub's search API can sometimes find users by commit email
    const result = await withRateLimit(async () => {
      const { data } = await octokit.search.users({
        q: `${email} in:email`,
        per_page: 1,
      });
      return data;
    });

    if (result && result.items.length > 0) {
      const user = result.items[0];
      const entry: CacheEntry = {
        email,
        username: user.login,
        avatarUrl: user.avatar_url,
        profileUrl: user.html_url,
        fetchedAt: new Date().toISOString(),
      };
      cache.users[email] = entry;
      return entry;
    }

    // If email search fails, try searching by username portion of email
    // e.g., "user@example.com" -> search for "user"
    const usernameGuess = email.split('@')[0];
    if (usernameGuess && usernameGuess.length >= 3) {
      const userResult = await withRateLimit(async () => {
        try {
          const { data } = await octokit.users.getByUsername({
            username: usernameGuess,
          });
          return data;
        } catch {
          return null;
        }
      });

      if (userResult) {
        const entry: CacheEntry = {
          email,
          username: userResult.login,
          avatarUrl: userResult.avatar_url,
          profileUrl: userResult.html_url,
          fetchedAt: new Date().toISOString(),
        };
        cache.users[email] = entry;
        return entry;
      }
    }

    return null;
  } catch (error) {
    console.warn(`Failed to find GitHub user for ${email}:`, error);
    return null;
  }
}

/**
 * Get user info from GitHub API by username
 */
export async function getUserByUsername(
  username: string
): Promise<Omit<CacheEntry, 'email' | 'fetchedAt'> | null> {
  try {
    const result = await withRateLimit(async () => {
      const { data } = await octokit.users.getByUsername({
        username,
      });
      return data;
    });

    if (result) {
      return {
        username: result.login,
        avatarUrl: result.avatar_url,
        profileUrl: result.html_url,
      };
    }

    return null;
  } catch (error) {
    console.warn(`Failed to fetch user ${username}:`, error);
    return null;
  }
}
