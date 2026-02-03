/**
 * Tunnel Ingress Update Handler
 *
 * POST /api/tunnel/update-ingress
 * Updates the remote ingress rules for a tunnel with a new backend port.
 * Called by the desktop app at tunnel start time.
 */

import type { Env } from './index';
import { verifyManagementKey } from './crypto';
import { updateTunnelIngress } from './cloudflare-api';

interface SubdomainData {
  tunnel_id: string;
  created_at: string;
  management_key_hash?: string;
}

interface UpdateIngressRequest {
  subdomain?: string;
  managementKey?: string;
  port?: number;
}

export async function handleUpdateIngress(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: UpdateIngressRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { subdomain, managementKey, port } = body;
  if (!subdomain || !managementKey || !port) {
    return Response.json(
      { error: 'subdomain, managementKey, and port are required' },
      { status: 400 },
    );
  }

  if (typeof port !== 'number' || port < 1 || port > 65535) {
    return Response.json(
      { error: 'port must be a valid port number (1-65535)' },
      { status: 400 },
    );
  }

  // Validate management key
  const subdomainData = await env.TUNNELS.get<SubdomainData>(
    `subdomain:${subdomain}`,
    'json',
  );
  if (!subdomainData?.management_key_hash) {
    return Response.json(
      { error: 'Subdomain not found or management key not configured' },
      { status: 404 },
    );
  }

  const keyValid = await verifyManagementKey(
    managementKey,
    subdomainData.management_key_hash,
  );
  if (!keyValid) {
    return Response.json({ error: 'Invalid management key' }, { status: 403 });
  }

  // Update remote ingress with the new port
  try {
    await updateTunnelIngress(
      env.CLOUDFLARE_ACCOUNT_ID,
      env.CLOUDFLARE_API_TOKEN,
      subdomainData.tunnel_id,
      subdomain,
      port,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      { error: `Failed to update ingress: ${msg}` },
      { status: 502 },
    );
  }

  return Response.json({ success: true });
}
