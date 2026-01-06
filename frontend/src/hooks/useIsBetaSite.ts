/**
 * Beta Site Detection Hook
 *
 * Determines if the app is running on a beta/preview environment.
 *
 * Shows on:
 * - beta.eclosion.app (custom beta domain)
 * - *.eclosion.pages.dev (Cloudflare Pages previews)
 *
 * Does NOT show on:
 * - eclosion.app (production)
 * - localhost (development)
 */

import { useMemo } from 'react';

/**
 * Check if current site is a beta/preview environment.
 */
export function useIsBetaSite(): boolean {
  return useMemo(() => {
    const hostname = globalThis.location?.hostname ?? '';

    // Exact match for beta subdomain
    if (hostname === 'beta.eclosion.app') {
      return true;
    }

    // Cloudflare Pages preview URLs (*.eclosion.pages.dev)
    if (hostname.endsWith('.pages.dev')) {
      return true;
    }

    return false;
  }, []);
}
