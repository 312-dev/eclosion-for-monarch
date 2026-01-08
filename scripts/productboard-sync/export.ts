/**
 * Export ideas to JSON file for frontend consumption
 * Hosted on GitHub raw for security (only repo owners can modify)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ProductBoardIdea, TrackedIdea, SyncState, ClosedReason, IdeaSource, IdeaAuthor } from './types.js';
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
  productboardUrl: string | null; // null for GitHub-only ideas
  discussionUrl: string | null;
  discussionNumber: number | null;
  status: 'open' | 'closed';
  closedReason: ClosedReason | null;
  closedAt: string | null;
  source: IdeaSource; // 'productboard' or 'github'
  author: IdeaAuthor | null; // GitHub Discussion author (null if unknown)
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
 * Clean ProductBoard description text by removing unnecessary escape characters.
 * ProductBoard stores descriptions with escaped special chars like \. and \-
 */
function cleanDescription(text: string): string {
  return text
    .replaceAll(/\\([.\-()[\]{}*+?^$|])/g, '$1') // Unescape regex special chars
    .replaceAll('<span data-preserve-white-space></span>', '') // Remove empty spans
    .replaceAll('<p></p>', '') // Remove empty paragraphs
    .trim();
}

/**
 * Transform ProductBoard ideas to public format
 */
function toPublicIdeasFromProductBoard(
  ideas: ProductBoardIdea[],
  state: Record<string, TrackedIdea>,
  repoUrl: string
): PublicIdea[] {
  return ideas
    .filter((idea) => state[idea.id]?.discussionNumber)
    .map((idea) => {
      const tracked = state[idea.id];
      return {
        id: idea.id,
        title: idea.title,
        description: cleanDescription(idea.description),
        votes: tracked.githubVotes ?? 0,
        category: idea.category,
        productboardUrl: idea.url,
        discussionUrl: `${repoUrl}/discussions/${tracked.discussionNumber}`,
        discussionNumber: tracked.discussionNumber,
        status: tracked.status,
        closedReason: tracked.closedReason ?? null,
        closedAt: tracked.closedAt ?? null,
        source: 'productboard' as const,
        author: tracked.author ?? null,
      };
    });
}

/**
 * Transform GitHub-only ideas to public format
 */
function toPublicIdeasFromGitHub(
  state: Record<string, TrackedIdea>,
  repoUrl: string
): PublicIdea[] {
  return Object.entries(state)
    .filter(([key, tracked]) => key.startsWith('github-') && tracked.source === 'github')
    .map(([key, tracked]) => ({
      id: key,
      title: tracked.title ?? 'Untitled',
      description: cleanDescription(tracked.description ?? ''),
      votes: tracked.githubVotes ?? 0,
      category: tracked.category ?? 'Community',
      productboardUrl: null,
      discussionUrl: `${repoUrl}/discussions/${tracked.discussionNumber}`,
      discussionNumber: tracked.discussionNumber,
      status: tracked.status,
      closedReason: tracked.closedReason ?? null,
      closedAt: tracked.closedAt ?? null,
      source: 'github' as const,
      author: tracked.author ?? null,
    }));
}

/**
 * Export ideas to JSON file
 */
export function exportIdeas(): void {
  console.log('='.repeat(60));
  console.log('Export Ideas to JSON');
  console.log('='.repeat(60));

  const state = loadState();
  const repoUrl = getRepoUrl();

  // Load ProductBoard ideas if available
  let productBoardIdeas: PublicIdea[] = [];
  const dataFile = existsSync(FILTERED_DATA_FILE) ? FILTERED_DATA_FILE : SCRAPED_DATA_FILE;
  if (existsSync(dataFile)) {
    const ideas = JSON.parse(readFileSync(dataFile, 'utf-8')) as ProductBoardIdea[];
    productBoardIdeas = toPublicIdeasFromProductBoard(ideas, state, repoUrl);
    console.log(`Found ${productBoardIdeas.length} ProductBoard ideas with discussions`);
  } else {
    console.log('No ProductBoard data found, checking for GitHub-only ideas...');
  }

  // Get GitHub-only ideas
  const githubIdeas = toPublicIdeasFromGitHub(state, repoUrl);
  console.log(`Found ${githubIdeas.length} GitHub-only ideas`);

  // Combine all ideas
  const allIdeas = [...productBoardIdeas, ...githubIdeas];

  // Separate open and closed for counting
  const openIdeas = allIdeas.filter((i) => i.status === 'open');
  const closedIdeas = allIdeas.filter((i) => i.status === 'closed');

  console.log(`Total: ${openIdeas.length} open, ${closedIdeas.length} closed`);

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
  console.log(`  - ${productBoardIdeas.length} from ProductBoard`);
  console.log(`  - ${githubIdeas.length} from GitHub`);
  console.log(`\nFrontend can fetch from:`);
  console.log(`  https://raw.githubusercontent.com/<owner>/<repo>/main/data/ideas.json`);
}
