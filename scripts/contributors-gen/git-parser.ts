/**
 * Git history parser for contributor detection
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import simpleGit from 'simple-git';
import { isBot, normalizeEmail } from './config.js';
import type { GitContributor } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '../..');
const git = simpleGit(ROOT_DIR);

/**
 * Get contributors from git history for the given source paths
 */
export async function getGitContributors(
  sourcePaths: string[]
): Promise<GitContributor[]> {
  const contributorMap = new Map<
    string,
    { name: string; email: string; commits: number }
  >();

  for (const sourcePath of sourcePaths) {
    try {
      // Get commit log for this path
      const log = await git.log({
        file: sourcePath,
        // Get all commits, not just recent ones
        maxCount: 1000,
      });

      for (const commit of log.all) {
        const email = normalizeEmail(commit.author_email);
        const name = commit.author_name;

        // Skip bots
        if (isBot(name, email)) {
          continue;
        }

        // Aggregate by email
        const existing = contributorMap.get(email);
        if (existing) {
          existing.commits++;
        } else {
          contributorMap.set(email, {
            name,
            email,
            commits: 1,
          });
        }
      }
    } catch (error) {
      // Path might not exist or have no git history
      console.warn(`Warning: Could not get git log for ${sourcePath}:`, error);
    }
  }

  // Convert to array and sort by commit count (descending)
  const contributors = Array.from(contributorMap.values())
    .map((c) => ({
      email: c.email,
      name: c.name,
      commits: c.commits,
    }))
    .sort((a, b) => b.commits - a.commits);

  return contributors;
}
