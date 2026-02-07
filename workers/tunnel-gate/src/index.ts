/**
 * Eclosion Tunnel Gate
 *
 * Edge-enforced OTP gate for *.eclosion.me tunnels.
 * Intercepts ALL requests before they reach the tunnel origin.
 *
 * Security model:
 * - JWT cookie validated on every request (pure CPU, no KV reads)
 * - JWT contains device binding (SHA-256 hash of device cookie)
 * - Auth cookies stripped before forwarding to tunnel origin
 * - OTP page served by Worker, not tunnel (attacker can't tamper with auth UI)
 *
 * Flow:
 * 1. Skip non-tunnel hostnames (tunnel-api, www, bare eclosion.me)
 * 2. Extract subdomain from hostname
 * 3. Check if OTP is configured for this subdomain (otp-email:{subdomain} in KV)
 * 4. If not configured, pass through (tunnel owner hasn't enabled OTP)
 * 5. Handle POST /.eclosion/set-session — validate KV token, sign JWT, set cookie
 * 6. Validate eclosion-otp JWT + eclosion-device cookie (pure crypto, no I/O)
 * 7. If valid: strip auth cookies, pass through to tunnel origin
 * 8. If invalid: serve self-contained OTP page
 */

import { signJwt, verifyJwt, type JwtPayload } from './jwt';
import { parseCookie, stripAuthCookies, buildSessionCookie } from './cookies';
import { generateOtpPage } from './otp-page';
import { generateOfflinePage } from './offline-page';

export interface Env {
  TUNNELS: KVNamespace;
  JWT_SECRET: string;
  JWT_SECRET_PREVIOUS?: string; // Optional fallback secret for seamless rotation
}

const SKIP_HOSTS = new Set([
  'eclosion.me',
  'www.eclosion.me',
  'tunnel-api.eclosion.me',
]);

const JWT_TTL_SECONDS = 604800; // 7 days

interface OtpSessionKvData {
  subdomain: string;
  device_key_hash: string;
  created_at: string;
}

interface SubdomainData {
  tunnel_id: string;
  created_at: string;
  management_key_hash?: string;
}

const ROBOTS_TXT = `User-agent: *
Disallow: /
`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Skip non-tunnel hosts — let other Workers or origins handle them
    if (SKIP_HOSTS.has(hostname)) {
      return fetch(request);
    }

    // Extract subdomain (e.g., "grayson" from "grayson.eclosion.me")
    if (!hostname.endsWith('.eclosion.me')) {
      return fetch(request);
    }
    const subdomain = hostname.replace('.eclosion.me', '');
    if (!subdomain || subdomain.includes('.')) {
      return fetch(request);
    }

    try {
      return await handleTunnelRequest(request, url, subdomain, env);
    } catch {
      return Response.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  },
};

// Cloudflare status codes that indicate the origin tunnel is unreachable
const OFFLINE_STATUS_CODES = new Set([502, 504, 521, 522, 523, 530]);

/**
 * Proxy request directly to the tunnel via cfargotunnel.com.
 * This bypasses DNS CNAME resolution by explicitly targeting the tunnel ID.
 * Returns a themed offline page if the tunnel is unreachable.
 */
async function fetchOriginToTunnel(
  request: Request,
  subdomain: string,
  tunnelId: string,
): Promise<Response> {
  const url = new URL(request.url);
  // Construct the tunnel origin URL using the tunnel ID directly
  const tunnelOrigin = `https://${tunnelId}.cfargotunnel.com`;
  const proxyUrl = `${tunnelOrigin}${url.pathname}${url.search}`;

  // Clone headers but set Host to the original hostname (tunnel expects this)
  const headers = new Headers(request.headers);
  headers.set('Host', `${subdomain}.eclosion.me`);

  const proxyRequest = new Request(proxyUrl, {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual', // Don't follow redirects, let client handle them
  });

  const response = await fetch(proxyRequest);
  if (OFFLINE_STATUS_CODES.has(response.status)) {
    return new Response(generateOfflinePage(subdomain), {
      status: 503,
      headers: {
        'Content-Type': 'text/html;charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
        'Cache-Control': 'no-store',
      },
    });
  }
  return response;
}

async function handleTunnelRequest(
  request: Request,
  url: URL,
  subdomain: string,
  env: Env,
): Promise<Response> {
  // Robots.txt — block crawlers on all tunnel subdomains
  if (url.pathname === '/robots.txt') {
    return new Response(ROBOTS_TXT, {
      headers: {
        'Content-Type': 'text/plain',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    });
  }

  // Check if this subdomain is claimed and get tunnel ID for proxying
  const subdomainDataRaw = await env.TUNNELS.get(`subdomain:${subdomain}`);
  if (!subdomainDataRaw) {
    // Unclaimed subdomain — redirect to main site
    return Response.redirect('https://eclosion.app', 302);
  }
  const subdomainData: SubdomainData = JSON.parse(subdomainDataRaw);
  const tunnelId = subdomainData.tunnel_id;

  // Check if OTP is configured for this subdomain
  const otpEmail = await env.TUNNELS.get(`otp-email:${subdomain}`);
  if (!otpEmail) {
    // No OTP email registered — tunnel owner hasn't enabled OTP or tunnel
    // is still in setup. Pass through without gating.
    return fetchOriginToTunnel(request, subdomain, tunnelId);
  }

  // Handle POST /.eclosion/set-session — OTP page calls this after successful verify
  if (url.pathname === '/.eclosion/set-session' && request.method === 'POST') {
    return handleSetSession(request, subdomain, env);
  }

  // IFTTT action bypass: validate X-IFTTT-Action-Secret header for /ifttt/* paths
  // This allows the IFTTT worker to proxy action requests without OTP
  if (url.pathname.startsWith('/ifttt/')) {
    const iftttSecret = request.headers.get('X-IFTTT-Action-Secret');
    if (iftttSecret) {
      const validSecret = await validateIftttSecret(iftttSecret, subdomain, env);
      if (validSecret) {
        // Valid IFTTT action secret — pass through to tunnel origin
        return fetchOriginToTunnel(request, subdomain, tunnelId);
      }
    }
    // For /ifttt/authorize, allow through without secret (handled by Flask after OTP)
    if (url.pathname === '/ifttt/authorize') {
      // Fall through to normal JWT validation
    }
  }

  // Validate JWT cookie + device cookie
  const jwtToken = parseCookie(request, 'eclosion-otp');
  const deviceKey = parseCookie(request, 'eclosion-device');

  if (jwtToken && deviceKey) {
    // Try current secret first, then fallback to previous (for rotation)
    let valid = await validateJwt(jwtToken, deviceKey, subdomain, env.JWT_SECRET);
    if (!valid && env.JWT_SECRET_PREVIOUS) {
      valid = await validateJwt(jwtToken, deviceKey, subdomain, env.JWT_SECRET_PREVIOUS);
    }
    if (valid) {
      // Valid session — strip auth cookies and pass through to tunnel origin
      return fetchOriginToTunnel(stripAuthCookies(request), subdomain, tunnelId);
    }
  }

  // No valid session — check Accept header to decide response format
  const accept = request.headers.get('Accept') ?? '';

  if (accept.includes('application/json') && !accept.includes('text/html')) {
    return Response.json(
      { error: 'OTP verification required', otp_required: true },
      {
        status: 401,
        headers: { 'X-Robots-Tag': 'noindex, nofollow, noarchive' },
      },
    );
  }

  // For non-HTML resource requests (fonts, images, scripts, etc.),
  // return 401 instead of serving the OTP page. This prevents service
  // workers from caching HTML as binary resources.
  if (!accept.includes('text/html')) {
    return new Response('OTP verification required', {
      status: 401,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
        'Cache-Control': 'no-store',
      },
    });
  }

  // Navigation requests — serve the self-contained OTP page
  return new Response(generateOtpPage(subdomain), {
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * SHA-256 hash a string and return the hex digest.
 */
async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validate an IFTTT action secret against the stored secret for a subdomain.
 * Used to bypass OTP for IFTTT action proxy requests.
 */
async function validateIftttSecret(
  providedSecret: string,
  subdomain: string,
  env: Env,
): Promise<boolean> {
  const storedSecret = await env.TUNNELS.get(`ifttt-secret:${subdomain}`);
  if (!storedSecret) return false;
  return constantTimeEqual(providedSecret, storedSecret);
}

/**
 * Validate a JWT session cookie against claims.
 *
 * Checks:
 * 1. HMAC signature is valid
 * 2. Token has not expired
 * 3. Subdomain claim matches current hostname
 * 4. Device hash matches SHA-256(device cookie)
 *
 * Cost: ~0.5ms CPU, no KV reads, no network calls.
 */
async function validateJwt(
  token: string,
  deviceKey: string,
  subdomain: string,
  secret: string,
): Promise<boolean> {
  const claims = await verifyJwt(token, secret);
  if (!claims) return false;

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp <= now) return false;

  // Check subdomain
  if (!constantTimeEqual(claims.sub, subdomain)) return false;

  // Check device binding
  const deviceHash = await sha256(deviceKey);
  if (!constantTimeEqual(deviceHash, claims.dev)) return false;

  return true;
}

/**
 * Handle POST /.eclosion/set-session
 *
 * Called by the OTP page JS after successful /api/otp/verify.
 * Validates the session token in KV (one-time read), then signs a JWT
 * and sets it as an HttpOnly cookie. Deletes the KV session entry.
 */
async function handleSetSession(
  request: Request,
  subdomain: string,
  env: Env,
): Promise<Response> {
  let body: { sessionToken?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sessionToken } = body;
  if (!sessionToken) {
    return Response.json(
      { error: 'sessionToken is required' },
      { status: 400 },
    );
  }

  // Validate that this session token exists in KV and is for this subdomain
  const sessionData = await env.TUNNELS.get<OtpSessionKvData>(
    `otp-session:${sessionToken}`,
    'json',
  );

  if (!sessionData) {
    return Response.json(
      { error: 'Invalid or expired session token' },
      { status: 401 },
    );
  }

  if (sessionData.subdomain !== subdomain) {
    return Response.json(
      { error: 'Session token does not match this subdomain' },
      { status: 403 },
    );
  }

  // Get the device key from the cookie and verify it matches
  const deviceKey = parseCookie(request, 'eclosion-device');
  if (!deviceKey) {
    return Response.json(
      { error: 'Device key cookie required' },
      { status: 400 },
    );
  }

  const deviceHash = await sha256(deviceKey);
  if (!constantTimeEqual(deviceHash, sessionData.device_key_hash)) {
    return Response.json(
      { error: 'Device key mismatch' },
      { status: 403 },
    );
  }

  // Sign JWT with claims
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: subdomain,
    dev: deviceHash,
    iat: now,
    exp: now + JWT_TTL_SECONDS,
  };

  const jwt = await signJwt(payload, env.JWT_SECRET);

  // Delete the KV session entry — it's been consumed into the JWT
  await env.TUNNELS.delete(`otp-session:${sessionToken}`);

  // Set the HttpOnly JWT cookie (host-only, no Domain attribute)
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildSessionCookie(jwt),
    },
  });
}
