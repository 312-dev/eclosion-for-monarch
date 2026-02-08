/**
 * Eclosion Tunnel Provisioner
 *
 * Cloudflare Worker that manages named tunnel provisioning for eclosion.me.
 * Handles subdomain claiming, availability checks, tunnel status, and OTP verification.
 *
 * Endpoints:
 *   POST /api/claim                — Claim a subdomain (creates tunnel + DNS)
 *   GET  /api/check/:name          — Check subdomain availability
 *   GET  /api/status/:name         — Check tunnel connection status
 *   POST /api/otp/register         — Register email for OTP (desktop → worker)
 *   POST /api/otp/deregister       — Deregister email on tunnel stop
 *   POST /api/otp/send             — Request OTP code (remote user)
 *   POST /api/otp/verify           — Verify OTP code (remote user)
 *   GET  /api/otp/session/:token   — Validate OTP session (backend → worker)
 *   POST /api/tunnel/update-ingress — Update tunnel ingress port (desktop → worker)
 *   POST /api/unclaim              — Release a claimed subdomain (deletes tunnel + DNS + KV)
 */

import { handleClaim } from './claim';
import { handleUnclaim } from './unclaim';
import { handleCheck } from './check';
import { handleStatus } from './status';
import {
  handleOtpRegister,
  handleOtpDeregister,
  handleOtpSend,
  handleOtpVerify,
  handleOtpSessionCheck,
} from './otp';
import { handleUpdateIngress } from './ingress';
import { handleMigrateDns } from './migrate-dns';
import { handleAdminCleanup } from './admin-cleanup';

export interface Env {
  TUNNELS: KVNamespace;
  CLOUDFLARE_ZONE_ID: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  RESEND_API_KEY: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function withCors(response: Response): Response {
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    newResponse.headers.set(key, value);
  }
  // Prevent search engine indexing of all API responses
  newResponse.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return newResponse;
}

const ROBOTS_TXT = `User-agent: *
Disallow: /
`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      return withCors(await handleRequest(request, env));
    } catch {
      // Ensure CORS headers are always present, even on unexpected crashes
      return withCors(
        Response.json({ error: 'Internal server error' }, { status: 500 }),
      );
    }
  },
};

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Robots.txt — block all crawlers
  if (path === '/robots.txt') {
    return new Response(ROBOTS_TXT, {
      headers: { 'Content-Type': 'text/plain', 'X-Robots-Tag': 'noindex, nofollow, noarchive' },
    });
  }

  // Route: POST /api/claim
  if (path === '/api/claim' && request.method === 'POST') {
    return handleClaim(request, env);
  }

  // Route: POST /api/unclaim
  if (path === '/api/unclaim' && request.method === 'POST') {
    return handleUnclaim(request, env);
  }

  // Route: GET /api/check/:subdomain
  const checkMatch = path.match(/^\/api\/check\/([a-z0-9-]+)$/);
  if (checkMatch && request.method === 'GET') {
    return handleCheck(checkMatch[1], env);
  }

  // Route: GET /api/status/:subdomain
  const statusMatch = path.match(/^\/api\/status\/([a-z0-9-]+)$/);
  if (statusMatch && request.method === 'GET') {
    return handleStatus(statusMatch[1], env);
  }

  // Route: POST /api/otp/register
  if (path === '/api/otp/register' && request.method === 'POST') {
    return handleOtpRegister(request, env);
  }

  // Route: POST /api/otp/deregister
  if (path === '/api/otp/deregister' && request.method === 'POST') {
    return handleOtpDeregister(request, env);
  }

  // Route: POST /api/otp/send
  if (path === '/api/otp/send' && request.method === 'POST') {
    return handleOtpSend(request, env);
  }

  // Route: POST /api/otp/verify
  if (path === '/api/otp/verify' && request.method === 'POST') {
    return handleOtpVerify(request, env);
  }

  // Route: GET /api/otp/session/:token
  const sessionMatch = path.match(/^\/api\/otp\/session\/([a-f0-9]+)$/);
  if (sessionMatch && request.method === 'GET') {
    return handleOtpSessionCheck(sessionMatch[1], request, env);
  }

  // Route: POST /api/tunnel/update-ingress
  if (path === '/api/tunnel/update-ingress' && request.method === 'POST') {
    return handleUpdateIngress(request, env);
  }

  // Route: POST /api/admin/migrate-dns
  if (path === '/api/admin/migrate-dns' && request.method === 'POST') {
    return handleMigrateDns(request, env);
  }

  // Route: POST /api/admin/cleanup
  if (path === '/api/admin/cleanup' && request.method === 'POST') {
    return handleAdminCleanup(request, env);
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
