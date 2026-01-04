/**
 * Environment Utilities
 *
 * Functions for detecting the deployment environment and building
 * environment-aware URLs for documentation and external links.
 */

/**
 * Check if the current site is a beta/preview environment.
 *
 * Beta environments include:
 * - beta.eclosion.app (custom beta subdomain)
 * - *.eclosion.pages.dev (Cloudflare Pages previews)
 */
export function isBetaEnvironment(): boolean {
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
}

/**
 * Get the base URL for documentation based on current environment.
 *
 * Returns:
 * - https://beta.eclosion.app/docs for beta environments
 * - https://eclosion.app/docs for production
 */
export function getDocsBaseUrl(): string {
  return isBetaEnvironment()
    ? 'https://beta.eclosion.app/docs'
    : 'https://eclosion.app/docs';
}

/**
 * Get the full URL to documentation for a specific version.
 *
 * @param version - Optional version string (e.g., "1.0", "1.1.0-beta.1")
 * @returns Full docs URL with version path if provided
 */
export function getDocsUrl(version?: string): string {
  const baseUrl = getDocsBaseUrl();
  return version ? `${baseUrl}/${version}` : baseUrl;
}

/**
 * Get the base site URL based on current environment.
 *
 * Returns:
 * - https://beta.eclosion.app for beta environments
 * - https://eclosion.app for production
 */
export function getSiteBaseUrl(): string {
  return isBetaEnvironment()
    ? 'https://beta.eclosion.app'
    : 'https://eclosion.app';
}
