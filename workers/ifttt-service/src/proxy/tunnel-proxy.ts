/**
 * Tunnel Proxy
 *
 * Forwards requests to a user's Eclosion instance via their Cloudflare tunnel.
 * Includes the X-IFTTT-Action-Secret header (per-subdomain) so the Flask
 * middleware skips OTP auth.
 *
 * Returns null if the tunnel is unreachable (offline), signaling the caller
 * to queue the action in the EventBroker instead.
 */

// Cloudflare status codes indicating the origin tunnel is unreachable
const OFFLINE_STATUS_CODES = new Set([502, 504, 521, 522, 523, 530]);

export interface ProxyResult {
  online: boolean;
  response?: Response;
  data?: Record<string, unknown>;
  proxyError?: string;
}

/**
 * Proxy a request to the user's tunnel origin.
 * Returns { online: false } if the tunnel is unreachable.
 */
export async function proxyToTunnel(
  subdomain: string,
  path: string,
  body: Record<string, unknown>,
  actionSecret: string,
): Promise<ProxyResult> {
  const url = `https://${subdomain}.eclosion.me${path}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-IFTTT-Action-Secret': actionSecret,
      },
      body: JSON.stringify(body),
    });

    if (OFFLINE_STATUS_CODES.has(response.status)) {
      return { online: false, proxyError: `tunnel_unreachable_${response.status}` };
    }

    const data = (await response.json()) as Record<string, unknown>;
    return { online: true, response, data };
  } catch (err) {
    // Network error — tunnel is offline
    const message = err instanceof Error ? err.message : 'network_error';
    return { online: false, proxyError: `fetch_failed: ${message}` };
  }
}

/**
 * Proxy a GET request to the user's tunnel origin for field options.
 */
export async function proxyFieldOptions(
  subdomain: string,
  path: string,
  actionSecret: string,
): Promise<ProxyResult> {
  const url = `https://${subdomain}.eclosion.me${path}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-IFTTT-Action-Secret': actionSecret,
      },
      body: '{}',
    });

    if (OFFLINE_STATUS_CODES.has(response.status)) {
      return { online: false };
    }

    const data = (await response.json()) as Record<string, unknown>;
    return { online: true, response, data };
  } catch {
    return { online: false };
  }
}
