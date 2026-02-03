/**
 * OTP Utilities
 *
 * OTP verification is now handled at the Cloudflare edge by the tunnel-gate Worker.
 * The gate Worker serves a self-contained OTP page and validates JWT cookies on every
 * request — the frontend never sees unauthenticated tunnel requests.
 *
 * This module only retains the tunnel detection utility.
 */

/**
 * Check if the current hostname is a tunnel access URL (*.eclosion.me).
 */
export function isTunnelAccess(): boolean {
  return globalThis.location.hostname.endsWith('.eclosion.me');
}
