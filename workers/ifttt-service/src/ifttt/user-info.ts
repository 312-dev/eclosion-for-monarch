/**
 * IFTTT User Info Endpoint
 *
 * GET /ifttt/v1/user/info
 * Returns the authenticated user's identity. IFTTT calls this after OAuth to verify
 * the access token works and to display the connected account.
 */

import { resolveSubdomain } from '../auth/tokens';
import type { Env } from '../types';

export async function handleUserInfo(request: Request, env: Env): Promise<Response> {
  const subdomain = await resolveSubdomain(request, env);
  if (!subdomain) {
    return Response.json(
      { errors: [{ message: 'Invalid or expired access token' }] },
      { status: 401 },
    );
  }

  return Response.json({
    data: {
      name: subdomain,
      id: subdomain,
      url: `https://${subdomain}.eclosion.me`,
    },
  });
}
