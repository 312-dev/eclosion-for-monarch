/**
 * Cloudflare API Wrapper
 *
 * Handles Tunnel creation and configuration.
 * Uses the Cloudflare v4 API with an API token scoped to:
 * - Cloudflare Tunnel: Edit
 *
 * Note: DNS is handled via wildcard CNAME (*.eclosion.me), so no per-subdomain
 * DNS operations are needed. The tunnel-gate Worker proxies directly to
 * {tunnelId}.cfargotunnel.com.
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const TUNNEL_DOMAIN = 'eclosion.me';
// Tunnel management mode: 'cloudflare' means ingress rules are managed remotely
// via the Cloudflare API. The gate Worker intercepts all traffic for OTP enforcement,
// and the desktop app calls the update-ingress endpoint to set the dynamic port.
const TUNNEL_CONFIG_SRC = 'cloudflare';

export interface TunnelCredentials {
  accountTag: string;
  tunnelId: string;
  tunnelSecret: string;
}

export interface TunnelInfo {
  id: string;
  name: string;
  status: string;
  connections: Array<{
    id: string;
    is_pending_reconnect: boolean;
    origin_ip: string;
    opened_at: string;
  }>;
}

interface CfApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
}

async function cfFetch<T>(
  path: string,
  apiToken: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${CF_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = (await response.json()) as CfApiResponse<T>;

  if (!data.success) {
    const errorMsg = data.errors.map((e) => e.message).join(', ');
    throw new Error(`Cloudflare API error: ${errorMsg}`);
  }

  return data.result;
}

/**
 * Create a new Cloudflare Tunnel.
 * Returns the tunnel ID and secret (credentials).
 */
export async function createTunnel(
  accountId: string,
  apiToken: string,
  name: string,
): Promise<TunnelCredentials> {
  // Generate a random tunnel secret (32 bytes, base64-encoded)
  const secretBytes = new Uint8Array(32);
  crypto.getRandomValues(secretBytes);
  const tunnelSecret = btoa(String.fromCharCode(...secretBytes));

  const result = await cfFetch<{ id: string; name: string }>(
    `/accounts/${accountId}/cfd_tunnel`,
    apiToken,
    {
      method: 'POST',
      body: JSON.stringify({
        name: `eclosion-${name}`,
        tunnel_secret: tunnelSecret,
        config_src: TUNNEL_CONFIG_SRC,
      }),
    },
  );

  return {
    accountTag: accountId,
    tunnelId: result.id,
    tunnelSecret,
  };
}

/**
 * Find a tunnel by name. Returns the tunnel ID if found, null otherwise.
 * Used to detect orphaned tunnels that weren't cleaned up properly.
 */
export async function findTunnelByName(
  accountId: string,
  apiToken: string,
  name: string,
): Promise<string | null> {
  const results = await cfFetch<Array<{ id: string }>>(
    `/accounts/${accountId}/cfd_tunnel?name=${encodeURIComponent(name)}&is_deleted=false`,
    apiToken,
  );
  return results.length > 0 ? results[0].id : null;
}

/**
 * Delete a Cloudflare Tunnel (cleanup).
 */
export async function deleteTunnel(
  accountId: string,
  apiToken: string,
  tunnelId: string,
): Promise<void> {
  await cfFetch<unknown>(
    `/accounts/${accountId}/cfd_tunnel/${tunnelId}`,
    apiToken,
    { method: 'DELETE' },
  );
}

/**
 * Get tunnel info including connection status.
 */
export async function getTunnelInfo(
  accountId: string,
  apiToken: string,
  tunnelId: string,
): Promise<TunnelInfo> {
  return cfFetch<TunnelInfo>(
    `/accounts/${accountId}/cfd_tunnel/${tunnelId}`,
    apiToken,
  );
}

/**
 * Configure the initial tunnel ingress rules (remote config).
 * Sets hostname routing with a default backend port.
 */
export async function configureTunnelIngress(
  accountId: string,
  apiToken: string,
  tunnelId: string,
  subdomain: string,
  port: number = 5001,
): Promise<void> {
  await cfFetch<unknown>(
    `/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`,
    apiToken,
    {
      method: 'PUT',
      body: JSON.stringify({
        config: {
          ingress: [
            {
              hostname: `${subdomain}.${TUNNEL_DOMAIN}`,
              service: `http://localhost:${port}`,
            },
            {
              service: 'http_status:404',
            },
          ],
        },
      }),
    },
  );
}

/**
 * Update tunnel ingress with a new backend port.
 * Called by the desktop app at tunnel start time to set the dynamic port.
 */
export async function updateTunnelIngress(
  accountId: string,
  apiToken: string,
  tunnelId: string,
  subdomain: string,
  port: number,
): Promise<void> {
  await configureTunnelIngress(accountId, apiToken, tunnelId, subdomain, port);
}

