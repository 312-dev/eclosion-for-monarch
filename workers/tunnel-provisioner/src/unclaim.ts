/**
 * Subdomain Unclaim Handler
 *
 * POST /api/unclaim
 * Releases a claimed subdomain by deleting the Cloudflare tunnel, DNS record,
 * and all KV entries. Requires the management key for authentication.
 */

import type { Env } from './index';
import { verifyManagementKey } from './crypto';
import { deleteTunnel } from './cloudflare-api';
import { logAudit, getClientIp } from './audit';

interface SubdomainData {
  tunnel_id: string;
  created_at: string;
  management_key_hash?: string;
}

interface UnclaimRequest {
  subdomain?: string;
  managementKey?: string;
}

export async function handleUnclaim(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: UnclaimRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { subdomain, managementKey } = body;
  if (!subdomain || !managementKey) {
    return Response.json(
      { error: 'subdomain and managementKey are required' },
      { status: 400 },
    );
  }

  // Look up subdomain in KV
  const subdomainData = await env.TUNNELS.get<SubdomainData>(
    `subdomain:${subdomain}`,
    'json',
  );
  if (!subdomainData?.management_key_hash) {
    return Response.json(
      { error: 'Subdomain not found' },
      { status: 404 },
    );
  }

  // Verify management key
  const keyValid = await verifyManagementKey(
    managementKey,
    subdomainData.management_key_hash,
  );
  if (!keyValid) {
    return Response.json({ error: 'Invalid management key' }, { status: 403 });
  }

  // Delete Cloudflare tunnel (non-fatal if it fails)
  // Note: No DNS cleanup needed - using wildcard CNAME
  try {
    await deleteTunnel(
      env.CLOUDFLARE_ACCOUNT_ID,
      env.CLOUDFLARE_API_TOKEN,
      subdomainData.tunnel_id,
    );
  } catch (error) {
    console.error(`Failed to delete tunnel ${subdomainData.tunnel_id}: ${error}`);
  }

  // Delete all KV entries for this subdomain
  await Promise.all([
    env.TUNNELS.delete(`subdomain:${subdomain}`),
    env.TUNNELS.delete(`otp-email:${subdomain}`),
    env.TUNNELS.delete(`otp:${subdomain}`),
    env.TUNNELS.delete(`otp-cooldown:${subdomain}`),
  ]);

  // Audit log: successful unclaim
  await logAudit(env.TUNNELS, 'unclaim', subdomain, getClientIp(request), true);

  return Response.json({ success: true });
}
