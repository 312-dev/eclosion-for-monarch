/**
 * Shared utilities for the release notes pipeline.
 *
 * Contains code used by both index.ts (release updater) and
 * generate-notes.ts (release notes generator).
 */

import { execSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions';

/** Maximum number of commits to include in release notes */
export const MAX_COMMITS = 30;

// ---------------------------------------------------------------------------
// Commit message normalization
// ---------------------------------------------------------------------------

/** Regex that matches conventional commit prefixes (feat, fix, etc.) */
const CONVENTIONAL_PREFIX = /^(feat|fix|refactor|chore|docs|style|perf|test|ci|build)(\([^)]*\))?: ?/i;

/** Regex that matches trailing PR link references */
const PR_LINK_SUFFIX = / in \[#\d+\]\([^)]+\)$/;

/**
 * Normalize a commit message for comparison by stripping the conventional
 * commit prefix, PR links, and lowercasing.
 */
export function normalizeCommitMessage(message: string): string {
  return message.replace(PR_LINK_SUFFIX, '').replace(CONVENTIONAL_PREFIX, '').toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// GitHub Models API helper
// ---------------------------------------------------------------------------

interface GitHubModelsOptions {
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Call the GitHub Models (Azure OpenAI) inference API.
 *
 * Uses the `MODELS_TOKEN` env var, falling back to `GH_TOKEN`.
 * Returns the trimmed content string, or `null` if the call fails
 * gracefully (non-ok status when `throwOnError` is false).
 */
export async function callGitHubModelsApi(
  options: GitHubModelsOptions & { throwOnError: true }
): Promise<string>;
export async function callGitHubModelsApi(
  options: GitHubModelsOptions & { throwOnError?: false }
): Promise<string | null>;
export async function callGitHubModelsApi({
  model,
  prompt,
  maxTokens = 1000,
  temperature = 0.5,
  throwOnError = false,
}: GitHubModelsOptions & { throwOnError?: boolean }): Promise<string | null> {
  const token = process.env.MODELS_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    if (throwOnError) throw new Error('MODELS_TOKEN environment variable is required');
    console.error('Warning: MODELS_TOKEN not set, skipping AI call');
    return null;
  }

  const response = await fetch(GITHUB_MODELS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (throwOnError) {
      throw new Error(`GitHub Models API error: ${response.status} - ${errorText}`);
    }
    console.error(`AI call failed: ${response.status}`);
    return null;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    if (throwOnError) throw new Error('No content in API response');
    return null;
  }

  return content.trim();
}

// ---------------------------------------------------------------------------
// Structured change summary (git diff analysis)
// ---------------------------------------------------------------------------

export interface StructuredChanges {
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
 * Extract the base filename (without extension) from a file path.
 */
function getBaseName(filePath: string): string {
  const match = filePath.match(/([^/]+)\.(tsx?|py)$/);
  return match ? match[1] : filePath;
}

/**
 * Get a structured summary of file-level changes between two git refs.
 *
 * Runs `git diff --name-status` across the key source directories and
 * categorizes changes into new/modified/renamed/deleted buckets by type
 * (components, hooks, API, utils).
 */
export function getStructuredChangeSummary(fromRef: string, toRef: string): string {
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

  for (const line of nameStatus.split('\n').filter(Boolean)) {
    const parts = line.split('\t');
    const status = parts[0];
    const filePath = parts.at(-1) ?? '';
    const oldPath = parts.length > 2 ? parts[1] : null;
    const name = getBaseName(filePath);

    // Skip test files, index files, and demo implementation files
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
      const oldName = getBaseName(oldPath);
      // Only include if actually renamed (not just moved)
      if (oldName !== name) {
        changes.renamed.push(`${oldName} → ${name}`);
      }
    }
  }

  // Dedupe arrays
  const dedupe = (arr: string[]): string[] => [...new Set(arr)].slice(0, 20);
  Object.keys(changes).forEach((key) => {
    changes[key as keyof StructuredChanges] = dedupe(changes[key as keyof StructuredChanges]);
  });

  // Build human-readable summary
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
