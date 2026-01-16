/**
 * Release Notes Parser
 *
 * Parses GitHub release notes markdown into structured changelog sections.
 */

export type ChangelogSections = {
  added?: string[];
  changed?: string[];
  fixed?: string[];
};

type SectionKey = 'added' | 'changed' | 'fixed';

const SECTION_PATTERNS: Array<{ pattern: RegExp; key: SectionKey }> = [
  { pattern: /^#{1,3}\s*(features?|new|added)/i, key: 'added' },
  { pattern: /^#{1,3}\s*(changes?|changed|improvements?)/i, key: 'changed' },
  { pattern: /^#{1,3}\s*(fix(es)?|bug\s*fix(es)?)/i, key: 'fixed' },
];

/**
 * Detects the section type from a header line.
 */
function detectSection(line: string): SectionKey | null {
  for (const { pattern, key } of SECTION_PATTERNS) {
    if (pattern.test(line)) return key;
  }
  return null;
}

/**
 * Parses a list item from a line and adds it to the appropriate section.
 */
function addListItem(line: string, section: SectionKey, sections: ChangelogSections): void {
  const item = line.replace(/^[-*]\s+/, '').trim();
  if (item) {
    const arr = (sections[section] ??= []);
    arr.push(item);
  }
}

/**
 * Extracts changelog entries from commit-style lines (feat:, fix:).
 */
function parseCommitStyleEntries(lines: string[], sections: ChangelogSections): void {
  for (const line of lines) {
    const trimmed = line.trim();
    if (!/^[-*]\s+/.test(trimmed)) continue;

    const item = trimmed.replace(/^[-*]\s+/, '').trim();
    if (/^feat/i.test(item)) {
      sections.added ??= [];
      sections.added.push(item.replace(/^feat[:(]\s*/i, '').replace(/^\)\s*:?\s*/, ''));
    } else if (/^fix/i.test(item)) {
      sections.fixed ??= [];
      sections.fixed.push(item.replace(/^fix[:(]\s*/i, '').replace(/^\)\s*:?\s*/, ''));
    }
  }
}

/**
 * Parses GitHub release notes markdown into changelog sections.
 * Looks for headers like "### Features", "### Bug Fixes", etc.
 */
export function parseReleaseNotes(body: string): ChangelogSections {
  const sections: ChangelogSections = {};
  if (!body) return sections;

  const lines = body.split('\n');
  let currentSection: SectionKey | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for section headers
    const detected = detectSection(trimmed);
    if (detected) {
      currentSection = detected;
      continue;
    }

    // Reset on other headers
    if (/^#{1,3}\s/.test(trimmed)) {
      currentSection = null;
      continue;
    }

    // Parse list items
    if (currentSection && /^[-*]\s+/.test(trimmed)) {
      addListItem(trimmed, currentSection, sections);
    }
  }

  // If no sections found, try commit-style parsing
  if (Object.keys(sections).length === 0) {
    parseCommitStyleEntries(lines, sections);
  }

  return sections;
}

const MAX_SUMMARY_LENGTH = 150;
const FIRST_SENTENCE_PATTERN = /^[^.!?]+[.!?]/;

/**
 * Checks if a line is a paragraph (not header, list, separator, or empty).
 */
function isParagraphLine(line: string): boolean {
  return (
    Boolean(line) &&
    !line.startsWith('#') &&
    !line.startsWith('-') &&
    !line.startsWith('*') &&
    !line.startsWith('---')
  );
}

/**
 * Truncates text to max length, adding ellipsis if needed.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Checks if the release body uses the new format with --- separator.
 * New format: summary at top, then ---, then ## Technical Details
 */
export function hasNewFormat(body: string): boolean {
  if (!body) return false;
  return body.includes('---') && /##\s*Technical Details/i.test(body);
}

/**
 * Extracts the summary from new format release notes.
 * Summary is everything before the first --- separator.
 */
export function extractNewFormatSummary(body: string): string | null {
  if (!body) return null;

  const separatorIndex = body.indexOf('---');
  if (separatorIndex === -1) return null;

  const summary = body.slice(0, separatorIndex).trim();
  if (!summary) return null;

  // Return the full summary (it's already been AI-generated to be concise)
  return summary;
}

/**
 * Extracts the technical details section from new format release notes.
 * Technical details start after ## Technical Details header.
 */
export function extractTechnicalDetails(body: string): string | null {
  if (!body) return null;

  const regex = /##\s*Technical Details\s*\n/i;
  const match = regex.exec(body);
  if (!match?.index) return null;

  return body.slice(match.index + match[0].length).trim();
}

/**
 * Extracts first paragraph as summary from release body.
 * Supports both new format (before ---) and legacy format (first paragraph).
 */
function extractParagraphSummary(body: string): string | null {
  if (!body) return null;

  // Try new format first
  if (hasNewFormat(body)) {
    return extractNewFormatSummary(body);
  }

  // Fall back to legacy format: first paragraph line
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!isParagraphLine(trimmed)) continue;

    // Found a paragraph - use first sentence or truncate
    const match = FIRST_SENTENCE_PATTERN.exec(trimmed);
    if (match?.[0] && match[0].length <= MAX_SUMMARY_LENGTH) {
      return match[0];
    }
    return truncateText(trimmed, MAX_SUMMARY_LENGTH);
  }
  return null;
}

/**
 * Generates a summary from changelog sections.
 */
function generateSectionsSummary(sections: ChangelogSections): string | null {
  const SUMMARY_ITEMS: Array<{ key: keyof ChangelogSections; singular: string; plural: string }> = [
    { key: 'added', singular: 'new feature', plural: 'new features' },
    { key: 'fixed', singular: 'bug fix', plural: 'bug fixes' },
    { key: 'changed', singular: 'improvement', plural: 'improvements' },
  ];

  const parts = SUMMARY_ITEMS
    .filter(({ key }) => sections[key]?.length)
    .map(({ key, singular, plural }) => {
      const count = sections[key]!.length;
      return `${count} ${count > 1 ? plural : singular}`;
    });

  return parts.length > 0 ? `Pre-release with ${parts.join(', ')}.` : null;
}

/**
 * Generates a summary for a beta release from its body and sections.
 */
export function generateBetaSummary(body: string, sections: ChangelogSections): string {
  return (
    extractParagraphSummary(body) ??
    generateSectionsSummary(sections) ??
    'Pre-release build from the develop branch.'
  );
}
