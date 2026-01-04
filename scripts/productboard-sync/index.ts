#!/usr/bin/env node
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrapeProductBoard, filterHighVoteIdeas } from './scraper.js';
import { syncToDiscussions } from './sync.js';
import { filterFeasibleIdeasWithAI, printFilterSummary } from './filter.js';
import { exportIdeas } from './export.js';
import type { ProductBoardIdea } from './types.js';
import { CONFIG } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRAPED_DATA_FILE = join(__dirname, 'scraped-ideas.json');
const FILTERED_DATA_FILE = join(__dirname, 'filtered-ideas.json');

async function scrape(): Promise<void> {
  console.log('='.repeat(60));
  console.log('ProductBoard Scraper');
  console.log('='.repeat(60));
  console.log(`Portal: ${CONFIG.PORTAL_URL}`);
  console.log(`Vote threshold: ${CONFIG.VOTE_THRESHOLD}`);
  console.log(`Tabs to scrape: ${CONFIG.TABS.join(', ')}`);
  console.log('');

  try {
    const ideas = await scrapeProductBoard();
    console.log(`\nTotal ideas scraped: ${ideas.length}`);

    const highVoteIdeas = filterHighVoteIdeas(ideas);
    console.log(`Ideas with ${CONFIG.VOTE_THRESHOLD}+ votes: ${highVoteIdeas.length}`);

    // Save scraped data for the filter/sync steps
    writeFileSync(SCRAPED_DATA_FILE, JSON.stringify(ideas, null, 2));
    console.log(`\nScraped data saved to ${SCRAPED_DATA_FILE}`);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('High-Vote Ideas Summary');
    console.log('='.repeat(60));

    const uncommitted = highVoteIdeas.filter((i) => i.status === 'idea');
    const committed = highVoteIdeas.filter(
      (i) => i.status === 'in_progress' || i.status === 'up_next'
    );

    console.log(`\nUncommitted (Ideas tab): ${uncommitted.length}`);
    for (const idea of uncommitted.slice(0, 10)) {
      console.log(`  - ${idea.title} (${idea.votes.toLocaleString()} votes)`);
    }
    if (uncommitted.length > 10) {
      console.log(`  ... and ${uncommitted.length - 10} more`);
    }

    console.log(`\nCommitted (In Progress/Up Next): ${committed.length}`);
    for (const idea of committed.slice(0, 5)) {
      console.log(`  - ${idea.title} [${idea.status}]`);
    }
    if (committed.length > 5) {
      console.log(`  ... and ${committed.length - 5} more`);
    }
  } catch (error) {
    console.error('Scraping failed:', error);
    process.exit(1);
  }
}

async function filter(): Promise<void> {
  console.log('='.repeat(60));
  console.log('AI Feasibility Filter');
  console.log('='.repeat(60));

  if (!existsSync(SCRAPED_DATA_FILE)) {
    console.error('No scraped data found. Run "scrape" first.');
    process.exit(1);
  }

  const ideas = JSON.parse(readFileSync(SCRAPED_DATA_FILE, 'utf-8')) as ProductBoardIdea[];
  const uncommitted = ideas.filter((i) => i.status === 'idea' && i.votes >= CONFIG.VOTE_THRESHOLD);

  console.log(`Filtering ${uncommitted.length} high-vote uncommitted ideas...`);

  try {
    const results = await filterFeasibleIdeasWithAI(uncommitted);
    printFilterSummary(results);

    // Save feasible ideas for sync
    const feasible = results.filter((r) => r.feasible).map((r) => r.idea);
    writeFileSync(FILTERED_DATA_FILE, JSON.stringify(feasible, null, 2));
    console.log(`\nSaved ${feasible.length} feasible ideas to ${FILTERED_DATA_FILE}`);
  } catch (error) {
    console.error('Filtering failed:', error);
    process.exit(1);
  }
}

async function sync(): Promise<void> {
  console.log('='.repeat(60));
  console.log('GitHub Discussions Sync');
  console.log('='.repeat(60));

  // Prefer filtered data if available, fall back to scraped data
  const dataFile = existsSync(FILTERED_DATA_FILE) ? FILTERED_DATA_FILE : SCRAPED_DATA_FILE;

  if (!existsSync(dataFile)) {
    console.error('No data found. Run "scrape" (and optionally "filter") first.');
    process.exit(1);
  }

  const ideas = JSON.parse(readFileSync(dataFile, 'utf-8')) as ProductBoardIdea[];
  const source = dataFile === FILTERED_DATA_FILE ? 'filtered' : 'scraped';
  console.log(`Loaded ${ideas.length} ${source} ideas`);

  try {
    await syncToDiscussions(ideas);
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

async function run(): Promise<void> {
  await scrape();
  console.log('\n');
  await filter();
  console.log('\n');
  await sync();
}

// CLI handling
const command = process.argv[2];

switch (command) {
  case 'scrape':
    await scrape();
    break;
  case 'filter':
    await filter();
    break;
  case 'sync':
    await sync();
    break;
  case 'export':
    exportIdeas();
    break;
  case 'run':
    await run();
    break;
  default:
    console.log(`
ProductBoard Sync CLI

Usage:
  npx tsx index.ts <command>

Commands:
  scrape    Scrape ideas from ProductBoard portal
  filter    Use AI to filter ideas Eclosion can realistically build
  sync      Sync filtered ideas to GitHub Discussions
  export    Export ideas to JSON for frontend consumption
  run       Run all steps: scrape → filter → sync

Environment:
  GH_TOKEN  GitHub token (required for filter and sync)
`);
    process.exit(command ? 1 : 0);
}
