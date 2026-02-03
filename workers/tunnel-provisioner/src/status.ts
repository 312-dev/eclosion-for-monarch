/**
 * Tunnel Connection Status
 *
 * GET /api/status/:subdomain
 * Returns whether the tunnel for a subdomain is currently connected.
 */

import type { Env } from './index';
import { getTunnelInfo } from './cloudflare-api';

interface KvTunnelData {
  tunnel_id: string;
  created_at: string;
}

export async function handleStatus(
  subdomain: string,
  env: Env,
): Promise<Response> {
  const normalized = subdomain.toLowerCase();

  // Look up the tunnel in KV
  const data = await env.TUNNELS.get<KvTunnelData>(
    `subdomain:${normalized}`,
    'json',
  );

  if (!data) {
    return Response.json(
      { error: 'Subdomain not found' },
      { status: 404 },
    );
  }

  try {
    const info = await getTunnelInfo(
      env.CLOUDFLARE_ACCOUNT_ID,
      env.CLOUDFLARE_API_TOKEN,
      data.tunnel_id,
    );

    const connected = info.connections.length > 0;

    return Response.json({
      connected,
      subdomain: normalized,
    });
  } catch {
    return Response.json(
      { connected: false, subdomain: normalized },
    );
  }
}
