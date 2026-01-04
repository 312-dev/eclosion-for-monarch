/**
 * Export ideas to JSON file for frontend consumption
 * Hosted on GitHub raw for security (only repo owners can modify)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ProductBoardIdea, TrackedIdea, SyncState, ClosedReason } from './types.js';
import { CONFIG } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILTERED_DATA_FILE = join(__dirname, 'filtered-ideas.json');
const SCRAPED_DATA_FILE = join(__dirname, 'scraped-ideas.json');
const STATE_FILE = join(__dirname, 'state.json');

// Output location - committed to repo for GitHub raw access
const OUTPUT_DIR = join(__dirname, '../../data');
const OUTPUT_FILE = join(OUTPUT_DIR, 'ideas.json');

/**
 * Public idea format for frontend (minimal, safe fields only)
 */
export interface PublicIdea {
  id: string;
  title: string;
  description: string;
  votes: number; // GitHub votes (thumbs-up reactions)
  category: string;
  productboardUrl: string;
  discussionUrl: string | null;
  discussionNumber: number | null;
  status: 'open' | 'closed';
  closedReason: ClosedReason | null;
  closedAt: string | null;
}

interface ExportedData {
  generatedAt: string;
  votesThreshold: number;
  totalIdeas: number;
  openCount: number;
  closedCount: number;
  ideas: PublicIdea[];
}

/**
 * Load sync state to get discussion info
 */
function loadState(): Record<string, TrackedIdea> {
  if (!existsSync(STATE_FILE)) {
    return {};
  }
  const content = readFileSync(STATE_FILE, 'utf-8');
  const state = JSON.parse(content) as SyncState;
  return state.trackedIdeas || {};
}

/**
 * Get the GitHub repo URL for constructing discussion URLs
 */
function getRepoUrl(): string {
  return process.env.GITHUB_REPOSITORY
    ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
    : 'https://github.com/educlos/eclosion';
}

/**
 * Transform internal ideas to public format
 * Only includes ideas that have been synced to GitHub Discussions
 */
function toPublicIdeas(
  ideas: ProductBoardIdea[],
  state: Record<string, TrackedIdea>
): PublicIdea[] {
  const repoUrl = getRepoUrl();

  // Only export ideas that have been synced to GitHub Discussions
  return ideas
    .filter((idea) => state[idea.id]?.discussionNumber)
    .map((idea) => {
      const tracked = state[idea.id];
      const discussionNumber = tracked.discussionNumber;

      return {
        id: idea.id,
        title: idea.title,
        description: idea.description,
        votes: tracked.githubVotes ?? 0, // Use GitHub votes, not ProductBoard
        category: idea.category,
        productboardUrl: idea.url,
        discussionUrl: `${repoUrl}/discussions/${discussionNumber}`,
        discussionNumber,
        status: tracked.status,
        closedReason: tracked.closedReason ?? null,
        closedAt: tracked.closedAt ?? null,
      };
    });
}

/**
 * Export ideas to JSON file
 */
export function exportIdeas(): void {
  console.log('='.repeat(60));
  console.log('Export Ideas to JSON');
  console.log('='.repeat(60));

  // Load ideas (prefer filtered, fall back to scraped)
  const dataFile = existsSync(FILTERED_DATA_FILE) ? FILTERED_DATA_FILE : SCRAPED_DATA_FILE;

  if (!existsSync(dataFile)) {
    console.error('No ideas data found. Run scrape (and filter) first.');
    process.exit(1);
  }

  const ideas = JSON.parse(readFileSync(dataFile, 'utf-8')) as ProductBoardIdea[];
  const state = loadState();

  // Include all ideas that have been synced (both open and closed)
  // The sync process already filters for high-vote ideas
  const publicIdeas = toPublicIdeas(ideas, state);

  // Separate open and closed for counting
  const openIdeas = publicIdeas.filter((i) => i.status === 'open');
  const closedIdeas = publicIdeas.filter((i) => i.status === 'closed');

  console.log(`Found ${openIdeas.length} open ideas, ${closedIdeas.length} closed ideas`);

  // Sort: open ideas first by votes descending, then closed by votes descending
  const sortedIdeas = [
    ...openIdeas.sort((a, b) => b.votes - a.votes),
    ...closedIdeas.sort((a, b) => b.votes - a.votes),
  ];

  const exportData: ExportedData = {
    generatedAt: new Date().toISOString(),
    votesThreshold: CONFIG.VOTE_THRESHOLD,
    totalIdeas: sortedIdeas.length,
    openCount: openIdeas.length,
    closedCount: closedIdeas.length,
    ideas: sortedIdeas,
  };

  const jsonContent = JSON.stringify(exportData, null, 2);

  // Ensure output directory exists
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Write JSON
  writeFileSync(OUTPUT_FILE, jsonContent);
  console.log(`\nExported ${sortedIdeas.length} ideas to ${OUTPUT_FILE}`);
  console.log(`  - ${openIdeas.length} open`);
  console.log(`  - ${closedIdeas.length} closed`);
  console.log(`\nFrontend can fetch from:`);
  console.log(`  https://raw.githubusercontent.com/<owner>/<repo>/main/data/ideas.json`);
}
