/**
 * Subdomain Availability Check
 *
 * GET /api/check/:subdomain
 * Returns whether a subdomain is available for claiming.
 */

import type { Env } from './index';
import { validateSubdomain } from './validation';

export async function handleCheck(
  subdomain: string,
  env: Env,
): Promise<Response> {
  // Validate the subdomain format
  const validation = validateSubdomain(subdomain);
  if (!validation.valid) {
    return Response.json(
      { available: false, error: validation.error },
      { status: 400 },
    );
  }

  const normalized = subdomain.toLowerCase();

  // Check KV for existing claim
  const existing = await env.TUNNELS.get(`subdomain:${normalized}`);

  return Response.json({ available: existing === null });
}
