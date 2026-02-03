/**
 * AI Release Notes Summarizer
 *
 * Takes technical release notes and generates a brief, user-friendly summary.
 * - Stable releases: proportional tone (brief for fixes, warmer for features)
 * - Beta releases: technical, matter-of-fact tone
 */

import { normalizeCommitMessage, callGitHubModelsApi } from './utils.js';

const MODEL = 'gpt-4o'; // Using GPT-4o for release notes summarization

/**
 * Patterns that indicate a change was superseded
 */
const SUPERSEDE_PATTERNS = [
  // Add then remove/revert
  { add: /^(add|implement|create|introduce)\s+/i, remove: /^(remove|delete|revert|drop)\s+/i },
  // Enable then disable
  { add: /^enable\s+/i, remove: /^disable\s+/i },
  // Show then hide
  { add: /^(show|display)\s+/i, remove: /^hide\s+/i },
];

/**
 * Topic patterns for detecting related/iterative commits
 * Each pattern returns a topic key if matched, null otherwise
 */
const TOPIC_EXTRACTORS: Array<{ pattern: RegExp; topic: string }> = [
  // macOS build/runner configuration
  { pattern: /\b(macos|mac).*?(runner|build|agent|x64|intel|arm64?|xlarge|namespace|profile)\b/i, topic: 'macos-build-config' },
  { pattern: /\b(intel|x64).*?(build|runner|agent)\b/i, topic: 'macos-build-config' },
  { pattern: /\bnamespace.*?(runner|profile|label|availability)\b/i, topic: 'macos-build-config' },
  // Universal/architecture builds
  { pattern: /\b(universal|arch|architecture).*?(build|binary|merge)\b/i, topic: 'universal-build' },
  { pattern: /\b(arm64|x64).*?(separately|instead|universal)\b/i, topic: 'universal-build' },
  { pattern: /\blipo\s+merge\b/i, topic: 'universal-build' },
  { pattern: /\bsingleArchFiles\b/i, topic: 'universal-build' },
  { pattern: /\bmatrix.*?parallel.*?build\b/i, topic: 'universal-build' },
  // Backend merge/directory
  { pattern: /\bbackend.*?(director|merge|separate|universal)\b/i, topic: 'universal-build' },
  // Notarization
  { pattern: /\b(notari|codesign|sign).*?(single|universal|build)\b/i, topic: 'notarization-config' },
  // Windows build
  { pattern: /\b(windows|win).*?(runner|build|agent)\b/i, topic: 'windows-build-config' },
  // Linux build
  { pattern: /\b(linux).*?(runner|build|agent)\b/i, topic: 'linux-build-config' },
];

/**
 * Verbs that indicate iterative/adjustment commits (trying different approaches)
 */
const ITERATIVE_VERBS = /^(use|try|switch\s+to|change\s+to|update|revert\s+to|restore|adjust|correct|ensure|keep)\s+/i;

/**
 * Extract the subject/topic from a commit message for comparison.
 * Alias for normalizeCommitMessage from utils.
 */
const extractSubject = normalizeCommitMessage;

/**
 * Extract a topic key from a commit message for grouping related commits
 */
function extractTopicKey(message: string): string | null {
  const subject = extractSubject(message);

  for (const { pattern, topic } of TOPIC_EXTRACTORS) {
    if (pattern.test(subject)) {
      return topic;
    }
  }

  return null;
}

/**
 * Check if a commit message indicates an iterative change (trying different approaches)
 */
function isIterativeCommit(message: string): boolean {
  const subject = extractSubject(message);
  return ITERATIVE_VERBS.test(subject);
}

/**
 * Group bullet points by their topic key
 */
function groupByTopic(
  bulletPoints: { index: number; content: string }[]
): Map<string, { index: number; content: string; isIterative: boolean }[]> {
  const topicGroups = new Map<string, { index: number; content: string; isIterative: boolean }[]>();

  for (const bp of bulletPoints) {
    const topic = extractTopicKey(bp.content);
    if (topic) {
      const group = topicGroups.get(topic) ?? [];
      if (!topicGroups.has(topic)) {
        topicGroups.set(topic, group);
      }
      group.push({
        index: bp.index,
        content: bp.content,
        isIterative: isIterativeCommit(bp.content),
      });
    }
  }

  return topicGroups;
}

/**
 * Process a single topic group and determine what to remove/consolidate
 */
function processTopicGroup(
  topic: string,
  commits: { index: number; content: string; isIterative: boolean }[],
  indicesToRemove: Set<number>,
  consolidatedMessages: Map<number, string>
): void {
  if (commits.length <= 1) return;

  // Check if this is a series of iterative commits (most have iterative verbs)
  const iterativeCount = commits.filter((c) => c.isIterative).length;
  const isIterativeSeries = iterativeCount >= commits.length * 0.5;

  if (!isIterativeSeries) return;

  // For iterative series, keep the first (most recent) and remove the rest
  const mostRecent = commits[0];

  // Mark all but the first for removal
  for (let i = 1; i < commits.length; i++) {
    indicesToRemove.add(commits[i].index);
  }

  // Generate a consolidated message based on the topic
  const consolidatedMsg = generateConsolidatedMessage(topic);
  if (consolidatedMsg && consolidatedMsg !== mostRecent.content) {
    consolidatedMessages.set(mostRecent.index, consolidatedMsg);
  }
}

/**
 * Group commits by topic and consolidate iterative changes
 * Returns a map of line indices to remove, and consolidated replacement messages
 */
function consolidateIterativeCommits(
  bulletPoints: { index: number; content: string }[]
): { indicesToRemove: Set<number>; consolidatedMessages: Map<number, string> } {
  const indicesToRemove = new Set<number>();
  const consolidatedMessages = new Map<number, string>();

  const topicGroups = groupByTopic(bulletPoints);

  for (const [topic, commits] of topicGroups) {
    processTopicGroup(topic, commits, indicesToRemove, consolidatedMessages);
  }

  return { indicesToRemove, consolidatedMessages };
}

/**
 * Generate a consolidated message for a group of related commits
 */
function generateConsolidatedMessage(topic: string): string | null {
  // Map topic keys to user-friendly consolidated messages
  const topicMessages: Record<string, string> = {
    'macos-build-config': 'Update macOS build runner configuration',
    'universal-build': 'Update build process for multi-architecture support',
    'notarization-config': 'Update code signing and notarization configuration',
    'windows-build-config': 'Update Windows build configuration',
    'linux-build-config': 'Update Linux build configuration',
  };

  return topicMessages[topic] || null;
}

/**
 * Patterns that indicate CI/build content even without conventional commit prefixes
 */
const CI_BUILD_PATTERNS = [
  /\b(runner|agent)\s*(label|profile|config)/i,
  /\bnamespace\s*(availability|profile|runner)/i,
  /\b(xlarge|large)\s*(runner|for)\b/i,
  /\bmacos-\d+(-\w+)?\s*(runner|for|build)/i,
  /\b(pre-namespace|namespace)\s*config/i,
  /\bretired\s*macos/i,
  /\bpyinstaller\b/i,
  /\bnsis\s*installer\b/i,
  /\belectron-builder\b/i,
  /\bgithub\s*actions?\b/i,
  /\bworkflow\s*(dispatch|run|trigger)/i,
];

/**
 * Check if a commit message is CI/build related (even without conventional prefix)
 */
function isCiBuildContent(message: string): boolean {
  const subject = extractSubject(message);
  return CI_BUILD_PATTERNS.some((pattern) => pattern.test(subject));
}

/**
 * Filter out CI/build commits that don't add user value
 * These are commits that slipped through without conventional commit prefixes
 */
function filterCiBuildNoise(
  bulletPoints: { index: number; content: string }[]
): Set<number> {
  const indicesToRemove = new Set<number>();

  for (const bp of bulletPoints) {
    // Check if this is CI/build content without user-facing value
    if (isCiBuildContent(bp.content)) {
      // Check if it's part of a topic group - if so, the consolidation will handle it
      const topic = extractTopicKey(bp.content);
      if (!topic) {
        // Not part of a recognized topic group, but still CI/build noise - remove it
        indicesToRemove.add(bp.index);
      }
    }
  }

  return indicesToRemove;
}

/**
 * Check if topics are similar enough to be considered the same
 */
function topicsMatch(topic1: string, topic2: string): boolean {
  return topic1 === topic2 || topic1.includes(topic2) || topic2.includes(topic1);
}

/**
 * Check if one message adds and another removes the same thing
 */
function checkAddRemovePair(
  subj1: string,
  subj2: string,
  pattern: { add: RegExp; remove: RegExp }
): boolean {
  const match1Add = pattern.add.exec(subj1);
  const match2Remove = pattern.remove.exec(subj2);

  if (match1Add && match2Remove) {
    const topic1 = subj1.replace(pattern.add, '').trim();
    const topic2 = subj2.replace(pattern.remove, '').trim();
    return topicsMatch(topic1, topic2);
  }

  const match1Remove = pattern.remove.exec(subj1);
  const match2Add = pattern.add.exec(subj2);

  if (match1Remove && match2Add) {
    const topic1 = subj1.replace(pattern.remove, '').trim();
    const topic2 = subj2.replace(pattern.add, '').trim();
    return topicsMatch(topic1, topic2);
  }

  return false;
}

/**
 * Check if one message is a revert of the other
 */
function checkRevertPair(subj1: string, subj2: string): boolean {
  const revertPattern = /^revert\s*"?/i;
  const cleanRevert = (s: string) => s.replace(revertPattern, '').replace(/"?\s*$/, '');

  if (subj1.startsWith('revert') && subj2.includes(cleanRevert(subj1))) {
    return true;
  }
  if (subj2.startsWith('revert') && subj1.includes(cleanRevert(subj2))) {
    return true;
  }
  return false;
}

/**
 * Check if two messages describe the same subject with opposite actions
 */
function areSupersedingMessages(msg1: string, msg2: string): boolean {
  const subj1 = extractSubject(msg1);
  const subj2 = extractSubject(msg2);

  // Check for add/remove pairs
  for (const pattern of SUPERSEDE_PATTERNS) {
    if (checkAddRemovePair(subj1, subj2, pattern)) {
      return true;
    }
  }

  // Check for explicit reverts
  return checkRevertPair(subj1, subj2);
}

/**
 * Extract bullet points from release notes
 */
function extractBulletPoints(lines: string[]): { index: number; content: string }[] {
  const bulletPoints: { index: number; content: string }[] = [];
  lines.forEach((line, index) => {
    if (line.startsWith('* ')) {
      bulletPoints.push({ index, content: line.slice(2) });
    }
  });
  return bulletPoints;
}

/**
 * Find indices of directly superseding message pairs (add/remove)
 */
function findDirectSupersededIndices(bulletPoints: { index: number; content: string }[]): Set<number> {
  const indices = new Set<number>();
  for (let i = 0; i < bulletPoints.length; i++) {
    for (let j = i + 1; j < bulletPoints.length; j++) {
      if (areSupersedingMessages(bulletPoints[i].content, bulletPoints[j].content)) {
        indices.add(bulletPoints[i].index);
        indices.add(bulletPoints[j].index);
      }
    }
  }
  return indices;
}

/**
 * Apply removals and consolidations to lines
 */
function applyChangesToLines(
  lines: string[],
  indicesToRemove: Set<number>,
  consolidatedMessages: Map<number, string>
): string[] {
  return lines
    .map((line, index) => {
      if (indicesToRemove.has(index)) return null;
      if (consolidatedMessages.has(index)) return `* ${consolidatedMessages.get(index)}`;
      return line;
    })
    .filter((line): line is string => line !== null);
}

/**
 * Remove empty section headers from cleaned lines
 */
function removeEmptySections(cleanedLines: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < cleanedLines.length; i++) {
    const line = cleanedLines[i];
    const nextLine = cleanedLines[i + 1];
    const isEmptySection =
      line.startsWith('### ') && (!nextLine || nextLine.startsWith('###') || nextLine.startsWith('---') || nextLine === '');
    if (!isEmptySection) {
      result.push(line);
    }
  }
  return result;
}

/**
 * Scrub superseded changes from release notes
 * Returns the cleaned notes with contradictory and iterative changes consolidated
 */
export function scrubSupersededChanges(technicalNotes: string): string {
  const lines = technicalNotes.split('\n');
  const bulletPoints = extractBulletPoints(lines);

  // Step 1: Find pairs of directly superseding changes (add/remove pairs)
  const directSupersededIndices = findDirectSupersededIndices(bulletPoints);

  // Step 2: Consolidate iterative commits (multiple attempts at same thing)
  const { indicesToRemove: iterativeIndices, consolidatedMessages } = consolidateIterativeCommits(bulletPoints);

  // Step 3: Filter out CI/build noise without conventional prefixes
  const ciBuildNoiseIndices = filterCiBuildNoise(bulletPoints);

  // Combine all indices to remove
  const allIndicesToRemove = new Set([...directSupersededIndices, ...iterativeIndices, ...ciBuildNoiseIndices]);

  if (allIndicesToRemove.size === 0 && consolidatedMessages.size === 0) {
    return technicalNotes;
  }

  const cleanedLines = applyChangesToLines(lines, allIndicesToRemove, consolidatedMessages);
  const result = removeEmptySections(cleanedLines);

  return result.join('\n');
}

/**
 * Scrub superseded items from structured change summary
 * Items that appear in both NEW and DELETED cancel out
 */
export function scrubSupersededStructuredChanges(changeSummary: string): string {
  const lines = changeSummary.split('\n');

  // Extract items from NEW and DELETED sections
  let inNew = false;
  let inDeleted = false;
  const newItems = new Set<string>();
  const deletedItems = new Set<string>();

  for (const line of lines) {
    if (line.includes('### NEW')) {
      inNew = true;
      inDeleted = false;
    } else if (line.includes('### REMOVED') || line.includes('### DELETED')) {
      inNew = false;
      inDeleted = true;
    } else if (line.startsWith('### ')) {
      inNew = false;
      inDeleted = false;
    }

    if (inNew && (line.startsWith('Components:') || line.startsWith('Hooks:') || line.startsWith('API') || line.startsWith('Utilities:'))) {
      const items = line.split(':')[1]?.split(',').map((s) => s.trim()) || [];
      items.forEach((item) => newItems.add(item));
    }
    if (inDeleted) {
      const items = line.split(',').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
      items.forEach((item) => deletedItems.add(item));
    }
  }

  // Find items that cancel out
  const cancelledItems = new Set<string>();
  for (const item of newItems) {
    if (deletedItems.has(item)) {
      cancelledItems.add(item);
    }
  }

  if (cancelledItems.size === 0) {
    return changeSummary;
  }

  // Remove cancelled items from the summary
  let result = changeSummary;
  for (const item of cancelledItems) {
    // Escape special regex characters in item name
    // eslint-disable-next-line prefer-regex-literals
    const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Remove from comma-separated lists
    result = result.replace(new RegExp(`${escaped},\\s*`, 'g'), '');
    result = result.replace(new RegExp(`,\\s*${escaped}`, 'g'), '');
    result = result.replace(new RegExp(`^${escaped}$`, 'gm'), '');
  }

  return result;
}

/**
 * Build the prompt for generating user-friendly release notes
 */
function buildPrompt(
  technicalNotes: string,
  version: string,
  isPrerelease: boolean,
  context?: string,
  diffContent?: string
): string {
  const releaseType = isPrerelease ? 'beta pre-release' : 'stable release';
  const contextSection = context ? `\n## Additional Context\n${context}\n` : '';

  // Include structured change summary if provided
  const changeSection = diffContent
    ? `\n## Code Change Analysis
This shows WHAT files were added, modified, renamed, or deleted. Use this to understand the scope and nature of changes:

${diffContent}
`
    : '';

  // Different tone for beta vs stable releases
  const toneGuidelines = isPrerelease
    ? `**Voice & Tone:**
- Technical and straightforward, like a changelog summary
- Matter-of-fact language without marketing fluff
- No exclamation points or celebratory language
- Focus on what changed, not how exciting it is
- Neutral, informative tone suitable for beta testers`
    : `**Voice & Tone:**
- Match your enthusiasm to the significance of the changes
- For bug fixes and minor updates: straightforward and brief ("Fixes an issue with...", "Resolves...")
- For notable features: warm but not over-the-top ("You can now...", "Adds support for...")
- For major releases only: celebratory language is appropriate
- Avoid marketing superlatives ("amazing", "exciting", "incredible") - just describe what changed
- Plain language a non-technical user would understand`;

  const formatGuidelines = isPrerelease
    ? `**Format:**
- Write 2-4 sentences as a brief summary
- Start directly with what changed (no greetings or fanfare)
- Keep it factual and concise
- If ALL changes are truly internal/technical with no user impact, respond with exactly: "Internal improvements and maintenance updates."`
    : `**Format:**
- Write 1-4 sentences - shorter is better for minor updates
- Get straight to the point - no fanfare for small fixes
- For bug fixes: a single sentence is often enough
- If ALL changes are truly internal/technical with no user impact, respond with exactly: "Internal improvements and maintenance."`;

  const examples = isPrerelease
    ? `**Good Examples:**
- "This beta adds a new Stash feature for saving toward goals. The burndown chart now shows progress over time."
- "You can now edit stash items inline. Several display issues with tooltips have been addressed."

**Bad Examples:**
- "Get ready for awesome improvements!" (too marketing-focused for beta)
- "Bug fixes and improvements" (too vague)
- "Fixed NSIS installer BUILD_UNINSTALLER check" (too low-level technical)
- "Refactored useEditStashHandlers hook" (too technical - describe the USER benefit)`
    : `**Good Examples (bug fix release):**
- "Fixes an issue where the app could become slow after auto-updating."
- "Resolves a display problem with the savings progress bar."

**Good Examples (feature release):**
- "You can now track savings goals with the new Stash feature. Also includes improved chart visualizations."
- "Adds burndown charts to show your savings progress over time. Several tooltip display issues have been fixed."

**Bad Examples:**
- "Bug fixes and improvements" (too vague - say WHAT was fixed)
- "Say hello to amazing new features!" (over-the-top for minor updates)
- "We're excited to announce..." (unnecessary preamble)
- "Fixed NSIS installer BUILD_UNINSTALLER check" (too technical for users)
- "Refactored API core layer" (too technical - users don't care about code structure)`;

  return `You are writing release notes for Eclosion, a desktop and web app that extends Monarch Money (a personal finance app).

**IMPORTANT: Only describe what changed in THIS release. Do not mention existing app features that aren't new.**

## Your Task
Transform the changes below into a ${isPrerelease ? 'concise technical summary' : 'friendly, conversational paragraph summary'} (2-4 sentences).

**CRITICAL: Use the Code Change Analysis to understand what REALLY changed!**
The structured summary shows new components, hooks, and APIs - use these to identify user-facing features.

## Commit Messages (For Reference Only)
${technicalNotes}
${changeSection}

## Version Info
- Version: ${version}
- Release type: ${releaseType}
${contextSection}

## Priority Order (FOLLOW THIS STRICTLY)
Your summary MUST prioritize in this order:

1. **NEW UX FEATURES (Core Features)** - Brand new capabilities users can now do
   - Look at the NEW section: new components, hooks, and API modules indicate new features
   - Example: "You can now track savings goals with the new Stash feature"

2. **RENAMED FEATURES** - If you see renames like "Wishlist → Stash", mention the rebrand
   - Example: "Wishlists have been renamed to Stashes"

3. **UI/UX IMPROVEMENTS** - Enhancements to existing features
   - Look at the MODIFIED section for improved components
   - Example: "The progress bar now animates smoothly"

4. **BUG FIXES** - Keep these BRIEF and in plain layman's terms
   - DON'T list every fix in detail - that's what Technical Details are for
   - DO summarize: "Several display issues have been addressed"
   - DON'T say: "Fixed the tooltip z-index calculation in AnimatedEmoji component"

## Writing Guidelines

${toneGuidelines}

**What to Include (based on the Code Change Analysis):**
- New features (look at NEW components, hooks, and API modules)
- Renamed features indicate major refactoring (e.g., Wishlist → Stash means the feature was renamed)
- Modified components suggest improvements or fixes
- A brief mention that bugs were fixed (without technical details)

**What to Exclude:**
- CI/CD pipeline changes, internal refactoring, dependency updates
- Build system changes (PyInstaller, signing, installers, universal binaries, architecture changes)
- Distribution details (how the app is packaged, notarized, or delivered)
- Code organization changes (moving files, renaming internal variables)
- Developer tooling, test changes
- Don't list every single bug fix - summarize them briefly

**IMPORTANT - Iterative Commits:**
If you see multiple commits about the SAME topic (e.g., several commits about "macOS runners" or "build configuration"), these represent multiple attempts to solve one problem. Only describe the FINAL result, not the journey. For example:
- BAD: "Updated macOS runner config, then tried different runners, then reverted..."
- GOOD: (just omit entirely - it's internal build config)
- Or if user-facing: describe only the end state achieved

**IMPORTANT - Duplicate/Redundant Fixes:**
If multiple commits fix the same thing in slightly different ways, treat them as ONE fix. Don't mention each attempt separately - just describe the end result once.

${formatGuidelines}

${examples}

Generate ONLY the paragraph. No headers, no bullets, no sign-off.`;
}

/**
 * Call the AI model to generate the summary.
 * Delegates to the shared callGitHubModelsApi helper.
 */
async function callAzureOpenAI(prompt: string): Promise<string> {
  return callGitHubModelsApi({
    model: MODEL,
    prompt,
    temperature: 0.5,
    throwOnError: true,
  });
}

/**
 * Generate a user-friendly summary from technical release notes
 */
export async function generateSummary(
  technicalNotes: string,
  version: string,
  isPrerelease: boolean,
  context?: string,
  diffContent?: string
): Promise<string> {
  console.log(`Generating user-friendly summary for ${version}...`);

  // Scrub superseded changes from both notes and diff content
  console.log('Scrubbing superseded changes...');
  const scrubbedNotes = scrubSupersededChanges(technicalNotes);
  const scrubbedDiff = diffContent ? scrubSupersededStructuredChanges(diffContent) : undefined;

  const notesRemoved = technicalNotes.length - scrubbedNotes.length;
  if (notesRemoved > 0) {
    console.log(`Removed ${notesRemoved} chars of superseded content from notes`);
  }

  if (scrubbedDiff) {
    console.log(`Including ${scrubbedDiff.length} chars of diff content for analysis`);
  }

  const prompt = buildPrompt(scrubbedNotes, version, isPrerelease, context, scrubbedDiff);
  const summary = await callAzureOpenAI(prompt);

  return summary;
}

/**
 * Combine the AI summary with the original technical notes
 */
export function buildUpdatedReleaseBody(summary: string, originalBody: string): string {
  return `${summary}

---

## Technical Details

${originalBody}`;
}
