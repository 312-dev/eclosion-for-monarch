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

interface StructuredChanges {
  newComponents: string[];
  newHooks: string[];
  newApi: string[];
  newUtils: string[];
  modifiedComponents: string[];
  modifiedHooks: string[];
  modifiedApi: string[];
  renamed: string[];
  deleted: string[];
}

/**
 * Get a structured summary of changes between two refs
 */
function getStructuredChangeSummary(fromRef: string, toRef: string): string {
  const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  const nameStatus = execSync(
    `git diff --name-status "${fromRef}"..${toRef} -- frontend/src/components/ frontend/src/pages/ frontend/src/hooks/ frontend/src/utils/ frontend/src/api/ services/ blueprints/`,
    { encoding: 'utf-8', cwd: repoRoot }
  );

  const changes: StructuredChanges = {
    newComponents: [],
    newHooks: [],
    newApi: [],
    newUtils: [],
    modifiedComponents: [],
    modifiedHooks: [],
    modifiedApi: [],
    renamed: [],
    deleted: [],
  };

  const getName = (filePath: string): string => {
    const match = filePath.match(/([^/]+)\.(tsx?|py)$/);
    return match ? match[1] : filePath;
  };

  for (const line of nameStatus.split('\n').filter(Boolean)) {
    const parts = line.split('\t');
    const status = parts[0];
    const filePath = parts.at(-1) ?? '';
    const oldPath = parts.length > 2 ? parts[1] : null;
    const name = getName(filePath);

    if (name.includes('.test') || name === 'index' || name.startsWith('demo')) continue;

    if (status === 'A') {
      if (filePath.includes('/components/')) changes.newComponents.push(name);
      else if (filePath.includes('/hooks/')) changes.newHooks.push(name);
      else if (filePath.includes('/api/') && !filePath.includes('/demo/')) changes.newApi.push(name);
      else if (filePath.includes('/utils/')) changes.newUtils.push(name);
    } else if (status === 'M') {
      if (filePath.includes('/components/')) changes.modifiedComponents.push(name);
      else if (filePath.includes('/hooks/')) changes.modifiedHooks.push(name);
      else if (filePath.includes('/api/') && !filePath.includes('/demo/')) changes.modifiedApi.push(name);
    } else if (status === 'D') {
      changes.deleted.push(name);
    } else if (status.startsWith('R') && oldPath) {
      const oldName = getName(oldPath);
      if (oldName !== name) changes.renamed.push(`${oldName} → ${name}`);
    }
  }

  const dedupe = (arr: string[]): string[] => [...new Set(arr)].slice(0, 20);
  Object.keys(changes).forEach((key) => {
    changes[key as keyof StructuredChanges] = dedupe(changes[key as keyof StructuredChanges]);
  });

  const lines: string[] = ['## Structured Change Summary\n'];

  if (changes.newComponents.length || changes.newHooks.length || changes.newApi.length || changes.newUtils.length) {
    lines.push('### NEW (Added Features)');
    if (changes.newComponents.length) lines.push(`Components: ${changes.newComponents.join(', ')}`);
    if (changes.newHooks.length) lines.push(`Hooks: ${changes.newHooks.join(', ')}`);
    if (changes.newApi.length) lines.push(`API modules: ${changes.newApi.join(', ')}`);
    if (changes.newUtils.length) lines.push(`Utilities: ${changes.newUtils.join(', ')}`);
    lines.push('');
  }

  if (changes.modifiedComponents.length || changes.modifiedHooks.length || changes.modifiedApi.length) {
    lines.push('### MODIFIED (Improvements/Fixes)');
    if (changes.modifiedComponents.length) lines.push(`Components: ${changes.modifiedComponents.join(', ')}`);
    if (changes.modifiedHooks.length) lines.push(`Hooks: ${changes.modifiedHooks.join(', ')}`);
    if (changes.modifiedApi.length) lines.push(`API: ${changes.modifiedApi.join(', ')}`);
    lines.push('');
  }

  if (changes.renamed.length) {
    lines.push('### RENAMED');
    lines.push(changes.renamed.join(', '));
    lines.push('');
  }

  if (changes.deleted.length) {
    lines.push('### REMOVED');
    lines.push(changes.deleted.join(', '));
    lines.push('');
  }

  return lines.join('\n');
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

  if (!tag) {
    console.error('Usage: npx tsx index.ts --tag <tag> [--dry-run] [--force] [--context "..."]');
    console.error('');
    console.error('Options:');
    console.error('  --tag <tag>       Release tag to update (required)');
    console.error('  --dry-run         Print the updated notes without saving');
    console.error('  --force           Regenerate even if summary already exists');
    console.error('  --context "..."   Optional context to guide AI summary');
    process.exit(1);
  }

  console.log('='.repeat(50));
  console.log('Release Notes Updater');
  console.log('='.repeat(50));
  console.log(`Tag: ${tag}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Force: ${force}`);
  if (context) console.log(`Context: ${context}`);
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
  const previousTag = getPreviousTag(tag);
  if (previousTag) {
    console.log(`Analyzing changes from ${previousTag} to ${tag}...`);
    try {
      changeSummary = getStructuredChangeSummary(previousTag, tag);
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
