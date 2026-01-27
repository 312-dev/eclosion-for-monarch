/**
 * Demo Stash Configuration API
 *
 * LocalStorage-based implementation of stash config for demo mode.
 */

import { getDemoState, updateDemoState, simulateDelay } from './demoState';
import type { StashConfig } from '../../types';

/**
 * Get category groups for stash selections.
 */
export async function getStashCategoryGroups(): Promise<{ id: string; name: string }[]> {
  await simulateDelay();
  return getDemoState().categoryGroups;
}

/**
 * Get stash configuration.
 */
export async function getStashConfig(): Promise<StashConfig> {
  await simulateDelay();
  return getDemoState().stashConfig;
}

/**
 * Update stash configuration.
 */
export async function updateStashConfig(
  updates: Partial<StashConfig>
): Promise<{ success: boolean }> {
  await simulateDelay();
  updateDemoState((state) => ({
    ...state,
    stashConfig: { ...state.stashConfig, ...updates },
  }));
  return { success: true };
}

/**
 * Fetch og:image from a URL (demo mode stub).
 */
export async function fetchOgImage(_url: string): Promise<string | null> {
  return null;
}

/**
 * Hardcoded favicons for common demo domains.
 * These are real favicon URLs that will be displayed in the UI.
 */
const DEMO_FAVICONS: Record<string, string> = {
  'apple.com': 'https://www.apple.com/favicon.ico',
  'amazon.com': 'https://www.amazon.com/favicon.ico',
  'rei.com': 'https://www.rei.com/favicon.ico',
  'bestbuy.com': 'https://www.bestbuy.com/favicon.ico',
  'nike.com': 'https://www.nike.com/favicon.ico',
  'target.com': 'https://www.target.com/favicon.ico',
  'walmart.com': 'https://www.walmart.com/favicon.ico',
  'costco.com': 'https://www.costco.com/favicon.ico',
  'homedepot.com': 'https://www.homedepot.com/favicon.ico',
  'lowes.com': 'https://www.lowes.com/favicon.ico',
  'ikea.com': 'https://www.ikea.com/favicon.ico',
  'wayfair.com': 'https://www.wayfair.com/favicon.ico',
  'etsy.com': 'https://www.etsy.com/favicon.ico',
  'ebay.com': 'https://www.ebay.com/favicon.ico',
  'newegg.com': 'https://www.newegg.com/favicon.ico',
};

/**
 * Fetch favicon from a domain (demo mode).
 * Returns hardcoded URLs for known domains, null for others.
 */
export async function fetchFavicon(domain: string): Promise<string | null> {
  await simulateDelay();
  // Normalize domain (remove www, lowercase)
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
  return DEMO_FAVICONS[normalizedDomain] ?? null;
}
