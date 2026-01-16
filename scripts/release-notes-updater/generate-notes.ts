#!/usr/bin/env tsx
/**
 * Release Notes Generator
 *
 * Generates categorized, polished release notes from git commits.
 * Shared between stable and beta release workflows.
 *
 * Usage:
 *   npx tsx generate-notes.ts --from v1.0.0 --to v1.0.1 --repo-url https://github.com/org/repo
 *   npx tsx generate-notes.ts --from v1.0.0 --to v1.0.1 --repo-url https://github.com/org/repo --beta
 *   npx tsx generate-notes.ts --from v1.0.0 --to v1.0.1 --repo-url https://github.com/org/repo --polish
 *   npx tsx generate-notes.ts --from v1.0.0 --to v1.0.1 --repo-url https://github.com/org/repo --beta --with-ai-summary
 *
 * Environment:
 *   MODELS_TOKEN - GitHub Models API token for AI polishing and summary generation
 */

import { execSync } from 'node:child_process';
import { generateSummary, buildUpdatedReleaseBody } from './generator.js';

const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions';
const MODEL = 'gpt-4o-mini'; // Using mini for quick polishing tasks

interface CommitCategories {
  features: string[];
  fixes: string[];
  improvements: string[];
  other: string[];
}

/**
 * Get commits between two refs, filtered and formatted
 */
function getCommits(fromRef: string, toRef: string, repoUrl: string): string[] {
  const raw = execSync(
    `git log "${fromRef}"..${toRef} --pretty=format:"%s (@%an)" --no-merges`,
    { encoding: 'utf-8' }
  );

  return raw
    .split('\n')
    .filter((line) => line.trim())
    // Filter out automated commits
    .filter((line) => !line.match(/^(chore: release|docs: create version)/))
    .filter((line) => !line.match(/^(ci|build|chore\(deps\)):/))
    // Remove owner attribution
    .map((line) => line.replace(/ \(@(Grayson Adams|GraysonAdams|GraysonCAdams)\)$/, ''))
    // Convert PR references to hyperlinks
    .map((line) => line.replace(/ \(#(\d+)\)/, ` in [#$1](${repoUrl}/pull/$1)`))
    .slice(0, 30);
}

/**
 * Categorize commits by conventional commit prefix
 */
function categorizeCommits(commits: string[]): CommitCategories {
  const categories: CommitCategories = {
    features: [],
    fixes: [],
    improvements: [],
    other: [],
  };

  for (const commit of commits) {
    if (commit.match(/^feat(\([^)]*\))?:/)) {
      categories.features.push(commit.replace(/^feat(\([^)]*\))?: /, ''));
    } else if (commit.match(/^fix(\([^)]*\))?:/)) {
      categories.fixes.push(commit.replace(/^fix(\([^)]*\))?: /, ''));
    } else if (commit.match(/^(refactor|perf|style)(\([^)]*\))?:/)) {
      categories.improvements.push(commit.replace(/^(refactor|perf|style)(\([^)]*\))?: /, ''));
    } else if (!commit.match(/^(chore|docs|test|ci|build)(\([^)]*\))?:/)) {
      categories.other.push(commit);
    }
  }

  return categories;
}

/**
 * Polish commit messages using AI (fix capitalization, improve clarity)
 */
async function polishMessages(messages: string[]): Promise<string[]> {
  if (messages.length === 0) return [];

  const token = process.env.MODELS_TOKEN;
  if (!token) {
    console.error('Warning: MODELS_TOKEN not set, skipping AI polish');
    return messages;
  }

  const prompt = `You are editing release notes for a software project. Fix the following bullet points to have consistent formatting:

1. Capitalize the first letter of each bullet point
2. Remove trailing periods (release notes don't use them)
3. Keep the same meaning - only fix capitalization and punctuation
4. Preserve markdown links exactly as they are

Input:
${messages.map((m) => `* ${m}`).join('\n')}

Output ONLY the fixed bullet points, one per line, starting with "* ". No explanations.`;

  try {
    const response = await fetch(GITHUB_MODELS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.1, // Very low for consistent formatting
      }),
    });

    if (!response.ok) {
      console.error(`AI polish failed: ${response.status}`);
      return messages;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return messages;

    // Parse the response back into messages
    return content
      .split('\n')
      .filter((line: string) => line.startsWith('* '))
      .map((line: string) => line.slice(2));
  } catch (error) {
    console.error('AI polish error:', error);
    return messages;
  }
}

/**
 * Build the final release notes markdown
 */
function buildReleaseNotes(
  categories: CommitCategories,
  repoUrl: string,
  fromTag: string,
  toTag: string
): string {
  const lines: string[] = [];

  lines.push("## What's Changed");
  lines.push('');

  if (categories.features.length > 0) {
    lines.push('### 🚀 Features');
    categories.features.forEach((f) => lines.push(`* ${f}`));
    lines.push('');
  }

  if (categories.fixes.length > 0) {
    lines.push('### 🐛 Bug Fixes');
    categories.fixes.forEach((f) => lines.push(`* ${f}`));
    lines.push('');
  }

  if (categories.improvements.length > 0) {
    lines.push('### ⚡ Improvements');
    categories.improvements.forEach((i) => lines.push(`* ${i}`));
    lines.push('');
  }

  if (categories.other.length > 0) {
    lines.push('### 📦 Other Changes');
    categories.other.forEach((o) => lines.push(`* ${o}`));
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('### Installation Notes');
  lines.push('');
  lines.push('**macOS:** Signed and notarized. Drag to Applications and launch.');
  lines.push('');
  lines.push('**Windows:** Click "More info" → "Run anyway" if SmartScreen appears.');
  lines.push('');
  lines.push('**Linux:** Run `chmod +x Eclosion-*.AppImage` to make executable.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`**Full Changelog**: ${repoUrl}/compare/${fromTag}...${toTag}`);

  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse arguments
  const fromIndex = args.indexOf('--from');
  const toIndex = args.indexOf('--to');
  const repoIndex = args.indexOf('--repo-url');

  const fromRef = fromIndex !== -1 ? args[fromIndex + 1] : null;
  const toRef = toIndex !== -1 ? args[toIndex + 1] : 'HEAD';
  const repoUrl = repoIndex !== -1 ? args[repoIndex + 1] : null;
  const isBeta = args.includes('--beta');
  const shouldPolish = args.includes('--polish');

  const withAiSummary = args.includes('--with-ai-summary');
  const versionIndex = args.indexOf('--version');
  const version = versionIndex !== -1 ? args[versionIndex + 1] : toRef;

  if (!fromRef || !repoUrl) {
    console.error(
      'Usage: npx tsx generate-notes.ts --from <ref> --to <ref> --repo-url <url> [--beta] [--polish] [--with-ai-summary] [--version <ver>]'
    );
    process.exit(1);
  }

  // Get and categorize commits
  const commits = getCommits(fromRef, toRef, repoUrl);
  const categories = categorizeCommits(commits);

  // Polish if requested
  if (shouldPolish) {
    console.error('Polishing release notes with AI...');
    categories.features = await polishMessages(categories.features);
    categories.fixes = await polishMessages(categories.fixes);
    categories.improvements = await polishMessages(categories.improvements);
    categories.other = await polishMessages(categories.other);
  }

  // Build technical notes
  const technicalNotes = buildReleaseNotes(categories, repoUrl, fromRef, toRef);

  // Generate AI summary if requested
  if (withAiSummary) {
    console.error('Generating AI summary...');
    const summary = await generateSummary(technicalNotes, version, isBeta);
    const finalNotes = buildUpdatedReleaseBody(summary, technicalNotes);
    console.log(finalNotes);
  } else {
    console.log(technicalNotes);
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
