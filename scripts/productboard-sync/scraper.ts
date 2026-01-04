import { chromium } from 'playwright';
import {
  type ProductBoardIdea,
  type IdeaStatus,
  CONFIG,
} from './types.js';

/** Raw data structure from ProductBoard's window.pbData */
interface PbData {
  portalCards: Array<{
    id: string;
    name: string;
    description: string;
    portalVotesCount: number;
    slug: string;
  }>;
  portalCardAssignments: Array<{
    portalCardId: string;
    portalTabId: string;
    portalSectionId: string;
  }>;
  portalTabs: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  portalSections: Array<{
    id: string;
    name: string;
  }>;
}

/** Map ProductBoard tab names to our status enum */
const TAB_TO_STATUS: Record<string, IdeaStatus> = {
  'Ideas': 'idea',
  'In Progress': 'in_progress',
  'Up Next': 'up_next',
  'Released': 'released',
  'Recently Released': 'released',
};

/**
 * Scrape ideas from ProductBoard portal by extracting window.pbData
 */
export async function scrapeProductBoard(): Promise<ProductBoardIdea[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`Navigating to ${CONFIG.PORTAL_URL}...`);
    await page.goto(CONFIG.PORTAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Extract the pbData object from the page (injected by ProductBoard)
    const pbData = await page.evaluate(() => {
      return (globalThis as unknown as { pbData: PbData }).pbData;
    }) as PbData;

    if (!pbData || !pbData.portalCards) {
      throw new Error('Could not find pbData on page');
    }

    console.log(`Found ${pbData.portalCards.length} total cards`);

    // Build lookup maps
    const tabMap = new Map(pbData.portalTabs.map((t) => [t.id, t]));
    const sectionMap = new Map(pbData.portalSections.map((s) => [s.id, s]));
    const assignmentMap = new Map(
      pbData.portalCardAssignments.map((a) => [a.portalCardId, a])
    );

    // Transform cards to our format
    const ideas: ProductBoardIdea[] = pbData.portalCards.map((card) => {
      const assignment = assignmentMap.get(card.id);
      const tab = assignment ? tabMap.get(assignment.portalTabId) : null;
      const section = assignment ? sectionMap.get(assignment.portalSectionId) : null;

      const tabName = tab?.name || 'Unknown';
      const status = TAB_TO_STATUS[tabName] || 'idea';

      return {
        id: card.id,
        title: card.name,
        description: card.description || '',
        votes: card.portalVotesCount || 0,
        category: section?.name || 'Uncategorized',
        status,
        url: `${CONFIG.PORTAL_URL}/c/${card.slug}`,
      };
    });

    // Log summary by tab
    const byTab = new Map<string, number>();
    for (const idea of ideas) {
      const count = byTab.get(idea.status) || 0;
      byTab.set(idea.status, count + 1);
    }
    console.log('Ideas by status:', Object.fromEntries(byTab));

    return ideas;
  } finally {
    await browser.close();
  }
}

/**
 * Filter ideas that meet the vote threshold
 */
export function filterHighVoteIdeas(ideas: ProductBoardIdea[]): ProductBoardIdea[] {
  return ideas.filter((idea) => idea.votes >= CONFIG.VOTE_THRESHOLD);
}

/**
 * Get ideas that are in "Ideas" tab only (uncommitted)
 */
export function getUncommittedIdeas(ideas: ProductBoardIdea[]): ProductBoardIdea[] {
  return ideas.filter((idea) => idea.status === 'idea');
}

/**
 * Get ideas that have moved to committed status (In Progress or Up Next)
 */
export function getCommittedIdeas(ideas: ProductBoardIdea[]): ProductBoardIdea[] {
  return ideas.filter((idea) => idea.status === 'in_progress' || idea.status === 'up_next');
}
