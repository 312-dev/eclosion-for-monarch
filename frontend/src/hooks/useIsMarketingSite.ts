/**
 * Marketing Site Detection Hook
 *
 * Determines if the app is running on the public marketing site (Cloudflare Pages)
 * vs a self-hosted instance.
 *
 * Marketing site: Shows demo CTAs, getting started, feature showcase
 * Self-hosted: Shows help docs, version info, changelog
 */

import { useMemo } from 'react';

/**
 * Marketing site hostnames.
 * Add any domains where the marketing/demo site is hosted.
 */
const MARKETING_HOSTNAMES = [
  'eclosion.app',
  'pages.dev', // Cloudflare Pages preview deployments
];

/**
 * Check if the current site is the public marketing site.
 *
 * Returns true on:
 * - Cloudflare Pages (*.pages.dev, eclosion.app)
 * - localhost (development)
 *
 * Returns false on:
 * - Self-hosted Docker instances
 * - Custom deployment domains
 */
export function useIsMarketingSite(): boolean {
  return useMemo(() => {
    const hostname = globalThis.location.hostname;

    // Development is treated as marketing site for testing
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }

    // Check if hostname includes any marketing domain
    return MARKETING_HOSTNAMES.some((domain) => hostname.includes(domain));
  }, []);
}

/**
 * Check if the current site is a self-hosted instance.
 * Inverse of useIsMarketingSite.
 */
export function useIsSelfHosted(): boolean {
  const isMarketingSite = useIsMarketingSite();
  return !isMarketingSite;
}
