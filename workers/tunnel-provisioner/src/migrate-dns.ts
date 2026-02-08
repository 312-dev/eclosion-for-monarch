/**
 * DNS Migration Handler
 *
 * POST /api/admin/migrate-dns
 * Re-registers proxied CNAME records for all existing claimed subdomains.
 * Used when transitioning from wildcard-only DNS to per-subdomain CNAMEs.
 *
 * Requires CLOUDFLARE_ACCOUNT_ID as the admin key in the request body
 * to prevent unauthorized access.
 */

import type { Env } from './index';
import { createDnsCname } from './cloudflare-api';

interface SubdomainData {
  tunnel_id: string;
  created_at: string;
  management_key_hash?: string;
}

interface MigrateRequest {
  adminKey?: string;
}

interface MigrateResult {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  details: Array<{
    subdomain: string;
    status: 'created' | 'skipped' | 'failed';
    error?: string;
  }>;
}

export async function handleMigrateDns(
  request: Request,
  env: Env,
): Promise<Response> {
  // Authenticate with account ID as admin key
  let body: MigrateRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.adminKey !== env.CLOUDFLARE_ACCOUNT_ID) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // List all KV keys with the subdomain: prefix
  const result: MigrateResult = {
    total: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  let cursor: string | undefined;
  const subdomains: Array<{ subdomain: string; tunnelId: string }> = [];

  // Collect all claimed subdomains from KV
  do {
    const listResult = await env.TUNNELS.list({
      prefix: 'subdomain:',
      cursor,
    });

    for (const key of listResult.keys) {
      const subdomain = key.name.replace('subdomain:', '');
      const data = await env.TUNNELS.get<SubdomainData>(key.name, 'json');
      if (data?.tunnel_id) {
        subdomains.push({ subdomain, tunnelId: data.tunnel_id });
      }
    }

    cursor = listResult.list_complete ? undefined : listResult.cursor;
  } while (cursor);

  result.total = subdomains.length;

  // Create CNAME records for each subdomain
  for (const { subdomain, tunnelId } of subdomains) {
    try {
      await createDnsCname(
        env.CLOUDFLARE_ZONE_ID,
        env.CLOUDFLARE_API_TOKEN,
        subdomain,
        tunnelId,
      );
      result.created++;
      result.details.push({ subdomain, status: 'created' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      // Record already exists — skip
      if (msg.includes('already exists')) {
        result.skipped++;
        result.details.push({ subdomain, status: 'skipped' });
      } else {
        result.failed++;
        result.details.push({ subdomain, status: 'failed', error: msg });
      }
    }
  }

  return Response.json(result);
}
