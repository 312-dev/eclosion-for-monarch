/**
 * Main generator logic for contributor attribution data
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getGitContributors } from './git-parser.js';
import { getIssueAuthor, getUserByEmail, getUserByUsername } from './github-client.js';
import { CACHE_TTL_MS, DEFAULT_IDEATOR_USERNAME } from './config.js';
import type {
  ContributorsData,
  FeatureContributors,
  Contributor,
  Cache,
} from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '../..');
const CACHE_FILE = join(__dirname, 'cache.json');
const OUTPUT_FILE = join(ROOT_DIR, 'frontend/src/data/contributors.json');

// Feature definitions - we need to read these from the frontend
interface FeatureDefinition {
  id: string;
  originIssue?: number;
  sourcePaths?: string[];
}

/**
 * Load feature definitions from the frontend
 * We parse the TypeScript file to extract the FEATURES array
 */
function loadFeatureDefinitions(): FeatureDefinition[] {
  const featuresPath = join(ROOT_DIR, 'frontend/src/data/features.ts');
  const content = readFileSync(featuresPath, 'utf-8');

  const features: FeatureDefinition[] = [];

  // Find all feature IDs first
  const idRegex = /id:\s*['"]([^'"]+)['"]/g;
  let idMatch;
  while ((idMatch = idRegex.exec(content)) !== null) {
    const id = idMatch[1];

    // Find the feature block that contains this ID
    const idPos = idMatch.index;

    // Look for originIssue near this ID (within ~500 chars)
    const nearbyContent = content.slice(idPos, idPos + 2000);
    const originIssueMatch = nearbyContent.match(/originIssue:\s*(\d+)/);
    const originIssue = originIssueMatch
      ? parseInt(originIssueMatch[1], 10)
      : undefined;

    // Look for sourcePaths array
    const sourcePathsMatch = nearbyContent.match(
      /sourcePaths:\s*\[([\s\S]*?)\]/
    );
    let sourcePaths: string[] | undefined;
    if (sourcePathsMatch) {
      const pathMatches = sourcePathsMatch[1].match(/['"]([^'"]+)['"]/g);
      if (pathMatches) {
        sourcePaths = pathMatches.map((p) => p.replace(/['"]/g, ''));
      }
    }

    features.push({ id, originIssue, sourcePaths });
  }

  return features;
}

/**
 * Load cache from disk
 */
function loadCache(): Cache {
  if (!existsSync(CACHE_FILE)) {
    return { users: {} };
  }
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
  } catch {
    return { users: {} };
  }
}

/**
 * Save cache to disk
 */
function saveCache(cache: Cache): void {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Check if a cache entry is still valid
 */
function isCacheValid(fetchedAt: string): boolean {
  const age = Date.now() - new Date(fetchedAt).getTime();
  return age < CACHE_TTL_MS;
}

/**
 * Clean expired cache entries
 */
function cleanCache(cache: Cache): void {
  for (const email of Object.keys(cache.users)) {
    if (!isCacheValid(cache.users[email].fetchedAt)) {
      delete cache.users[email];
    }
  }
}

/**
 * Generate contributor data for all features
 */
export async function generateContributorsData(): Promise<ContributorsData> {
  console.log('Loading feature definitions...');
  const features = loadFeatureDefinitions();
  console.log(`Found ${features.length} features`);

  console.log('Loading cache...');
  const cache = loadCache();
  cleanCache(cache);

  const result: ContributorsData = {
    generatedAt: new Date().toISOString(),
    features: {},
  };

  for (const feature of features) {
    console.log(`\nProcessing feature: ${feature.id}`);

    const featureData: FeatureContributors = {
      featureId: feature.id,
      ideator: null,
      contributors: [],
      lastUpdated: new Date().toISOString(),
    };

    // Get ideator from GitHub issue or use default
    if (feature.originIssue) {
      console.log(`  Fetching issue #${feature.originIssue} author...`);
      featureData.ideator = await getIssueAuthor(feature.originIssue);
      if (featureData.ideator) {
        console.log(`  Ideator: @${featureData.ideator.username}`);
      }
    } else {
      // Use default ideator when no origin issue is specified
      console.log(`  Using default ideator: @${DEFAULT_IDEATOR_USERNAME}`);
      const defaultUser = await getUserByUsername(DEFAULT_IDEATOR_USERNAME);
      if (defaultUser) {
        featureData.ideator = {
          username: defaultUser.username,
          avatarUrl: defaultUser.avatarUrl,
          profileUrl: defaultUser.profileUrl,
          commits: 0,
        };
      }
    }

    // Get contributors from git history
    if (feature.sourcePaths && feature.sourcePaths.length > 0) {
      console.log(`  Scanning ${feature.sourcePaths.length} source paths...`);
      const gitContributors = await getGitContributors(feature.sourcePaths);
      console.log(`  Found ${gitContributors.length} contributors in git history`);

      // Enrich with GitHub data
      const contributors: Contributor[] = [];
      for (const gc of gitContributors) {
        const githubUser = await getUserByEmail(gc.email, cache);
        if (githubUser) {
          // Skip if this is the ideator (avoid duplication)
          if (
            featureData.ideator &&
            githubUser.username.toLowerCase() ===
              featureData.ideator.username.toLowerCase()
          ) {
            continue;
          }

          contributors.push({
            username: githubUser.username,
            avatarUrl: githubUser.avatarUrl,
            profileUrl: githubUser.profileUrl,
            commits: gc.commits,
          });
        } else {
          console.log(`  Could not find GitHub user for ${gc.email}`);
        }
      }

      featureData.contributors = contributors;
      console.log(`  Resolved ${contributors.length} GitHub users`);
    }

    result.features[feature.id] = featureData;
  }

  // Save updated cache
  console.log('\nSaving cache...');
  saveCache(cache);

  return result;
}

/**
 * Write contributor data to the output file
 */
export function writeContributorsData(data: ContributorsData): void {
  // Ensure directory exists
  const dir = dirname(OUTPUT_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
  console.log(`\nWrote contributor data to ${OUTPUT_FILE}`);
}
