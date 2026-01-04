import { chromium, type Page } from 'playwright';
import {
  type ProductBoardIdea,
  type IdeaStatus,
  TAB_STATUS_MAP,
  CONFIG,
} from './types.js';

/**
 * Scrape ideas from all configured tabs on the ProductBoard portal
 */
export async function scrapeProductBoard(): Promise<ProductBoardIdea[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const allIdeas: ProductBoardIdea[] = [];

  try {
    // Navigate to the portal
    console.log(`Navigating to ${CONFIG.PORTAL_URL}...`);
    await page.goto(CONFIG.PORTAL_URL, { waitUntil: 'networkidle' });

    // Wait for the portal to load
    await page.waitForSelector('[data-testid="portal-tabs"], .portal-tabs, nav', {
      timeout: 30000,
    });

    // Scrape each configured tab
    for (const tabName of CONFIG.TABS) {
      console.log(`Scraping tab: ${tabName}...`);
      const ideas = await scrapeTab(page, tabName);
      allIdeas.push(...ideas);
      console.log(`  Found ${ideas.length} ideas`);
    }

    return allIdeas;
  } finally {
    await browser.close();
  }
}

/**
 * Scrape ideas from a specific tab
 */
async function scrapeTab(page: Page, tabName: string): Promise<ProductBoardIdea[]> {
  const status = TAB_STATUS_MAP[tabName] || 'idea';

  // Click the tab to switch to it
  const tabSelector = `[role="tab"]:has-text("${tabName}"), button:has-text("${tabName}"), a:has-text("${tabName}")`;

  try {
    await page.click(tabSelector, { timeout: 5000 });
    // Wait for content to load
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');
  } catch {
    console.warn(`  Could not find tab "${tabName}", skipping...`);
    return [];
  }

  // Extract ideas from the current view
  const ideas = await page.evaluate(
    ({ status, tabName, portalUrl }) => {
      const results: ProductBoardIdea[] = [];

      // ProductBoard uses various card/feature selectors
      // Try multiple patterns to find idea cards
      const cardSelectors = [
        '[data-testid="feature-card"]',
        '[data-testid="idea-card"]',
        '.feature-card',
        '.idea-card',
        '[class*="FeatureCard"]',
        '[class*="IdeaCard"]',
        'article',
        '[role="listitem"]',
      ];

      let cards: Element[] = [];
      for (const selector of cardSelectors) {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          cards = Array.from(found);
          break;
        }
      }

      // If no cards found with specific selectors, try a more generic approach
      if (cards.length === 0) {
        // Look for elements that have vote counts (indicative of idea cards)
        const allElements = document.querySelectorAll('*');
        cards = Array.from(allElements).filter((el) => {
          const text = el.textContent || '';
          // Look for vote patterns like "1,234" or "123 votes"
          return /\d{2,}/.test(text) && el.querySelector('h2, h3, h4, [class*="title"]');
        });
      }

      for (const card of cards) {
        try {
          // Extract title - look for heading elements or title classes
          const titleEl =
            card.querySelector('h1, h2, h3, h4, [class*="title"], [class*="Title"]') ||
            card.querySelector('[data-testid="feature-title"]');
          const title = titleEl?.textContent?.trim() || '';

          if (!title) continue;

          // Extract description
          const descEl =
            card.querySelector('p, [class*="description"], [class*="Description"]') ||
            card.querySelector('[data-testid="feature-description"]');
          const description = descEl?.textContent?.trim() || '';

          // Extract vote count - look for numbers that could be votes
          const voteEl =
            card.querySelector('[class*="vote"], [class*="Vote"], [data-testid*="vote"]') ||
            card.querySelector('[class*="count"], [class*="Count"]');
          let votes = 0;
          if (voteEl) {
            const voteText = voteEl.textContent || '';
            const match = voteText.replace(/,/g, '').match(/(\d+)/);
            if (match) {
              votes = parseInt(match[1], 10);
            }
          }

          // Extract category from section headers or breadcrumbs
          let category = 'Uncategorized';
          const sectionEl = card.closest('section, [class*="section"], [class*="Section"]');
          if (sectionEl) {
            const sectionTitle = sectionEl.querySelector('h2, h3, [class*="header"]');
            if (sectionTitle) {
              category = sectionTitle.textContent?.trim() || category;
            }
          }

          // Extract ID from data attributes or generate from title
          const id =
            card.getAttribute('data-id') ||
            card.getAttribute('data-feature-id') ||
            card.querySelector('a')?.href?.split('/').pop() ||
            title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

          // Extract URL
          const linkEl = card.querySelector('a[href]') as HTMLAnchorElement | null;
          const url = linkEl?.href || `${portalUrl}/tabs/1-ideas`;

          results.push({
            id,
            title,
            description,
            votes,
            category,
            status: status as IdeaStatus,
            url,
          });
        } catch {
          // Skip cards that can't be parsed
          continue;
        }
      }

      return results;
    },
    { status, tabName, portalUrl: CONFIG.PORTAL_URL }
  );

  return ideas;
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
