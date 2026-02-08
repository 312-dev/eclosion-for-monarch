/**
 * Admin Cleanup Handler
 *
 * POST /api/admin/cleanup
 * Deletes specified subdomains: DNS records, tunnels, and KV entries.
 * Requires CLOUDFLARE_ACCOUNT_ID as admin key.
 */

import type { Env } from './index';
import { deleteTunnel, deleteDnsCname } from './cloudflare-api';

interface SubdomainData {
  tunnel_id: string;
  created_at: string;
  management_key_hash?: string;
}

interface CleanupRequest {
  adminKey?: string;
  subdomains?: string[];
}

export async function handleAdminCleanup(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: CleanupRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.adminKey !== env.CLOUDFLARE_ACCOUNT_ID) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!body.subdomains || body.subdomains.length === 0) {
    return Response.json({ error: 'subdomains array required' }, { status: 400 });
  }

  const results: Array<{ subdomain: string; dns: string; tunnel: string; kv: string }> = [];

  for (const subdomain of body.subdomains) {
    const result = { subdomain, dns: 'skipped', tunnel: 'skipped', kv: 'skipped' };

    // Get subdomain data from KV
    const data = await env.TUNNELS.get<SubdomainData>(`subdomain:${subdomain}`, 'json');

    // Delete DNS CNAME
    try {
      await deleteDnsCname(env.CLOUDFLARE_ZONE_ID, env.CLOUDFLARE_API_TOKEN, subdomain);
      result.dns = 'deleted';
    } catch (error) {
      result.dns = `error: ${error instanceof Error ? error.message : String(error)}`;
    }

    // Delete tunnel
    if (data?.tunnel_id) {
      try {
        await deleteTunnel(env.CLOUDFLARE_ACCOUNT_ID, env.CLOUDFLARE_API_TOKEN, data.tunnel_id);
        result.tunnel = 'deleted';
      } catch (error) {
        result.tunnel = `error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    // Delete all KV entries
    await Promise.all([
      env.TUNNELS.delete(`subdomain:${subdomain}`),
      env.TUNNELS.delete(`otp-email:${subdomain}`),
      env.TUNNELS.delete(`otp:${subdomain}`),
      env.TUNNELS.delete(`otp-cooldown:${subdomain}`),
      env.TUNNELS.delete(`ifttt-secret:${subdomain}`),
    ]);
    result.kv = 'deleted';

    results.push(result);
  }

  return Response.json({ results });
}
