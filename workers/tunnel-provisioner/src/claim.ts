/**
 * Subdomain Claim Handler
 *
 * POST /api/claim
 * Creates a Cloudflare Tunnel, DNS CNAME, and KV entry for a subdomain.
 * Returns tunnel credentials (one-time only — not recoverable).
 */

import type { Env } from './index';
import type { TunnelCredentials } from './cloudflare-api';
import { validateSubdomain } from './validation';
import {
  createTunnel,
  configureTunnelIngress,
  deleteTunnel,
  findTunnelByName,
} from './cloudflare-api';
import { generateRandomHex, hashManagementKey } from './crypto';
import { logAudit } from './audit';

interface ClaimRequest {
  subdomain: string;
}

const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds
const RATE_LIMIT_MAX = 2; // Max claims per IP per hour

/**
 * Check and enforce rate limiting by IP.
 * Returns true if the request should be rate-limited.
 */
async function isRateLimited(
  ip: string,
  kv: KVNamespace,
): Promise<boolean> {
  const key = `ratelimit:${ip}`;
  const current = await kv.get<number>(key, 'json');

  if (current !== null && current >= RATE_LIMIT_MAX) {
    return true;
  }

  // Increment counter with TTL
  await kv.put(key, JSON.stringify((current ?? 0) + 1), {
    expirationTtl: RATE_LIMIT_WINDOW,
  });

  return false;
}

/**
 * Create a tunnel, cleaning up any orphaned tunnel with the same name.
 * Orphans can occur when unclaim's tunnel deletion fails (treated as non-fatal).
 * Safe because we only reach this code after confirming no KV entry exists for
 * the subdomain, meaning no one currently owns it.
 */
async function createTunnelWithOrphanCleanup(
  env: Env,
  subdomain: string,
): Promise<TunnelCredentials> {
  try {
    return await createTunnel(
      env.CLOUDFLARE_ACCOUNT_ID,
      env.CLOUDFLARE_API_TOKEN,
      subdomain,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (!msg.includes('already have a tunnel with this name')) {
      throw error;
    }

    // Orphaned tunnel — find and delete it, then retry
    const orphanId = await findTunnelByName(
      env.CLOUDFLARE_ACCOUNT_ID,
      env.CLOUDFLARE_API_TOKEN,
      `eclosion-${subdomain}`,
    );
    if (orphanId) {
      await deleteTunnel(
        env.CLOUDFLARE_ACCOUNT_ID,
        env.CLOUDFLARE_API_TOKEN,
        orphanId,
      );
    }
    return await createTunnel(
      env.CLOUDFLARE_ACCOUNT_ID,
      env.CLOUDFLARE_API_TOKEN,
      subdomain,
    );
  }
}

export async function handleClaim(
  request: Request,
  env: Env,
): Promise<Response> {
  // Rate limit by IP
  const clientIp = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (await isRateLimited(clientIp, env.TUNNELS)) {
    return Response.json(
      { error: 'Rate limited. Maximum 2 claims per hour.' },
      { status: 429 },
    );
  }

  // Parse and validate request body
  let body: ClaimRequest;
  try {
    body = (await request.json()) as ClaimRequest;
  } catch {
    return Response.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  if (!body.subdomain) {
    return Response.json(
      { error: 'subdomain is required' },
      { status: 400 },
    );
  }

  const subdomain = body.subdomain.toLowerCase();

  // Validate subdomain format
  const validation = validateSubdomain(subdomain);
  if (!validation.valid) {
    return Response.json(
      { error: validation.error },
      { status: 400 },
    );
  }

  // Check if subdomain is already taken
  const existing = await env.TUNNELS.get(`subdomain:${subdomain}`);
  if (existing) {
    return Response.json(
      { error: 'Subdomain is already claimed' },
      { status: 409 },
    );
  }

  // Create tunnel, cleaning up any orphan from a previous failed unclaim
  let credentials: TunnelCredentials;
  try {
    credentials = await createTunnelWithOrphanCleanup(env, subdomain);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      { error: `Failed to create tunnel: ${msg}` },
      { status: 502 },
    );
  }

  // Configure initial ingress rules with default port
  // Note: DNS is handled via wildcard CNAME, no per-subdomain record needed
  try {
    await configureTunnelIngress(
      env.CLOUDFLARE_ACCOUNT_ID,
      env.CLOUDFLARE_API_TOKEN,
      credentials.tunnelId,
      subdomain,
    );
  } catch (error) {
    // Non-fatal — desktop will update ingress at tunnel start time
    // Log but don't fail the claim
    console.error(`Failed to configure initial ingress: ${error}`);
  }

  // Generate a management key for OTP registration
  const managementKey = generateRandomHex(32);
  const managementKeyHash = await hashManagementKey(managementKey);

  // Store in KV (includes management key hash for future OTP operations)
  await env.TUNNELS.put(
    `subdomain:${subdomain}`,
    JSON.stringify({
      tunnel_id: credentials.tunnelId,
      created_at: new Date().toISOString(),
      management_key_hash: managementKeyHash,
    }),
  );

  // Audit log: successful claim
  await logAudit(env.TUNNELS, 'claim', subdomain, clientIp, true);

  // Return credentials + management key — this is the ONLY time they are available
  return Response.json({
    subdomain,
    tunnelId: credentials.tunnelId,
    accountTag: credentials.accountTag,
    tunnelSecret: credentials.tunnelSecret,
    managementKey,
  });
}
