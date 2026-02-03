#!/usr/bin/env tsx
/**
 * Release Notes Updater CLI
 *
 * Usage:
 *   npx tsx index.ts --tag v1.2.3
 *   npx tsx index.ts --tag v1.2.3 --dry-run
 *   npx tsx index.ts --tag v1.2.3 --context "Focus on the Windows improvements"
 *
 * Environment:
 *   MODELS_TOKEN - GitHub Models API token for AI generation
 *   GITHUB_TOKEN - GitHub token for release updates (gh CLI uses this or existing auth)
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateSummary, buildUpdatedReleaseBody } from './generator.js';
import { getStructuredChangeSummary } from './utils.js';

interface ReleaseInfo {
  tagName: string;
  name: string;
  body: string;
  isPrerelease: boolean;
  isDraft: boolean;
}

/**
 * Fetch release info from GitHub using gh CLI
 */
function fetchRelease(tag: string): ReleaseInfo {
  console.log(`Fetching release info for ${tag}...`);

  try {
    const output = execSync(
      `gh release view "${tag}" --json tagName,name,body,isPrerelease,isDraft`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    return JSON.parse(output);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch release ${tag}: ${message}`);
  }
}

/**
 * Update a release's body using gh CLI
 */
function updateRelease(tag: string, newBody: string): void {
  console.log(`Updating release ${tag}...`);

  // Write body to temp file to avoid shell escaping issues
  const tempFile = path.join(os.tmpdir(), `release-notes-${Date.now()}.md`);
  fs.writeFileSync(tempFile, newBody);

  try {
    execSync(`gh release edit "${tag}" --notes-file "${tempFile}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } finally {
    fs.unlinkSync(tempFile);
  }
}

/**
 * Check if release already has an AI-generated summary
 */
function hasExistingSummary(body: string): boolean {
  // Check for the pattern: bullets followed by --- followed by ## Technical Details
  // This indicates we've already added a summary above the original notes
  return body.includes('---\n\n## Technical Details');
}

/**
 * Extract the original technical notes if we need to regenerate
 */
function extractOriginalNotes(body: string): string {
  // If we've already added a summary, extract the original notes after the ---
  const match = body.match(/---\n\n## Technical Details\n\n([\s\S]*)/);
  if (match) {
    return match[1].trim();
  }
  return body;
}

/**
 * Get the previous release tag to compare against
 */
function getPreviousTag(currentTag: string): string | null {
  try {
    // Get stable releases to compare against (always compare to last stable)
    const output = execSync(
      `gh release list --exclude-pre-releases --exclude-drafts --limit 10 --json tagName --jq '.[].tagName'`,
      {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    const tags = output.trim().split('\n').filter(Boolean);
    // Find the first tag that's not the current one
    for (const tag of tags) {
      if (tag !== currentTag) {
        return tag;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse arguments
  const tagIndex = args.indexOf('--tag');
  const tag = tagIndex !== -1 ? args[tagIndex + 1] : null;
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const contextIndex = args.indexOf('--context');
  const context = contextIndex !== -1 ? args[contextIndex + 1] : undefined;
  const compareFromIndex = args.indexOf('--compare-from');
  const compareFrom = compareFromIndex !== -1 ? args[compareFromIndex + 1] : undefined;

  if (!tag) {
    console.error('Usage: npx tsx index.ts --tag <tag> [--dry-run] [--force] [--context "..."] [--compare-from <ref>]');
    console.error('');
    console.error('Options:');
    console.error('  --tag <tag>           Release tag to update (required)');
    console.error('  --dry-run             Print the updated notes without saving');
    console.error('  --force               Regenerate even if summary already exists');
    console.error('  --context "..."       Optional context to guide AI summary');
    console.error('  --compare-from <ref>  SHA or tag to compare from (defaults to previous stable release)');
    process.exit(1);
  }

  console.log('='.repeat(50));
  console.log('Release Notes Updater');
  console.log('='.repeat(50));
  console.log(`Tag: ${tag}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Force: ${force}`);
  if (context) console.log(`Context: ${context}`);
  if (compareFrom) console.log(`Compare from: ${compareFrom}`);
  console.log('');

  // Fetch the release
  const release = fetchRelease(tag);

  console.log(`Release: ${release.name}`);
  console.log(`Prerelease: ${release.isPrerelease}`);
  console.log(`Draft: ${release.isDraft}`);
  console.log('');

  // Check if already processed
  if (hasExistingSummary(release.body) && !force) {
    console.log('Release already has an AI-generated summary. Use --force to regenerate.');
    process.exit(0);
  }

  // Get the original technical notes
  const technicalNotes = extractOriginalNotes(release.body);

  if (!technicalNotes.trim()) {
    console.log('Release has no body content to summarize.');
    process.exit(0);
  }

  console.log('Original notes:');
  console.log('-'.repeat(40));
  console.log(technicalNotes.slice(0, 500) + (technicalNotes.length > 500 ? '...' : ''));
  console.log('-'.repeat(40));
  console.log('');

  // Skip AI summary for prereleases (beta) - they just get technical notes
  if (release.isPrerelease) {
    console.log('Skipping AI summary for prerelease (technical notes only)');
    process.exit(0);
  }

  // Get structured change summary for AI analysis
  let changeSummary: string | undefined;
  const baseRef = compareFrom || getPreviousTag(tag);
  if (baseRef) {
    console.log(`Analyzing changes from ${baseRef} to ${tag}...`);
    try {
      changeSummary = getStructuredChangeSummary(baseRef, tag);
      console.log(`Got structured summary (${changeSummary.length} chars)`);
    } catch (error) {
      console.log(`Could not get change summary: ${error}`);
    }
  } else {
    console.log('Could not determine previous tag for comparison');
  }

  // Generate the summary
  const summary = await generateSummary(technicalNotes, tag, false, context, changeSummary);

  console.log('Generated summary:');
  console.log('-'.repeat(40));
  console.log(summary);
  console.log('-'.repeat(40));
  console.log('');

  // Build the new body
  const newBody = buildUpdatedReleaseBody(summary, technicalNotes);

  if (dryRun) {
    console.log('DRY RUN - Would update release with:');
    console.log('='.repeat(50));
    console.log(newBody);
    console.log('='.repeat(50));
  } else {
    updateRelease(tag, newBody);
    console.log(`Successfully updated release ${tag}`);
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
