/**
 * Environment Utilities
 *
 * Functions for detecting the deployment environment and building
 * environment-aware URLs for documentation and external links.
 */

const BETA_OVERRIDE_KEY = 'eclosion-beta-mode';
const DESKTOP_BETA_KEY = 'eclosion-desktop-beta';

/**
 * Check if the current site is a beta/preview environment.
 *
 * Beta environments include:
 * - beta.eclosion.app (custom beta subdomain)
 * - *.eclosion.pages.dev (Cloudflare Pages previews)
 * - Desktop app running a beta build (detected via update channel)
 * - Local override via localStorage (for testing)
 */
export function isBetaEnvironment(): boolean {
  // Check for local override (for testing)
  if (typeof localStorage !== 'undefined') {
    const override = localStorage.getItem(BETA_OVERRIDE_KEY);
    if (override === 'true') return true;
    if (override === 'false') return false;

    // Check for desktop beta flag (set during app initialization)
    const desktopBeta = localStorage.getItem(DESKTOP_BETA_KEY);
    if (desktopBeta === 'true') return true;
  }

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
 * Initialize desktop beta detection.
 * Call this during app startup to detect if the desktop app is a beta build.
 * Sets a localStorage flag so isBetaEnvironment() can check synchronously.
 */
export async function initializeDesktopBetaDetection(): Promise<void> {
  if (typeof localStorage === 'undefined') return;

  // Check if we're in desktop mode with electron API
  const electron = (globalThis as { electron?: { getUpdateChannel?: () => Promise<'stable' | 'beta'> } }).electron;
  if (!electron?.getUpdateChannel) {
    // Not desktop mode - clear any stale flag
    localStorage.removeItem(DESKTOP_BETA_KEY);
    return;
  }

  try {
    const channel = await electron.getUpdateChannel();
    if (channel === 'beta') {
      localStorage.setItem(DESKTOP_BETA_KEY, 'true');
    } else {
      localStorage.removeItem(DESKTOP_BETA_KEY);
    }
  } catch {
    // Failed to get channel - clear flag to be safe
    localStorage.removeItem(DESKTOP_BETA_KEY);
  }
}

/**
 * Enable or disable beta mode override for local testing.
 * Call setBetaModeOverride(true) to simulate beta environment locally.
 * Call setBetaModeOverride(null) to clear the override.
 */
export function setBetaModeOverride(enabled: boolean | null): void {
  if (typeof localStorage === 'undefined') return;

  if (enabled === null) {
    localStorage.removeItem(BETA_OVERRIDE_KEY);
  } else {
    localStorage.setItem(BETA_OVERRIDE_KEY, String(enabled));
  }
}

/**
 * Get the current beta mode override state.
 * Returns null if no override is set.
 */
export function getBetaModeOverride(): boolean | null {
  if (typeof localStorage === 'undefined') return null;

  const value = localStorage.getItem(BETA_OVERRIDE_KEY);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
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
