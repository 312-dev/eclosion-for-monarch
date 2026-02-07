/**
 * Eclosion IFTTT Service Worker
 *
 * Cloudflare Worker that acts as the IFTTT service shim for Eclosion.
 * Routes IFTTT API requests, handles OAuth2, and manages the EventBroker
 * for offline action queuing and trigger event storage.
 *
 * Endpoints:
 *   GET  /ifttt/v1/status                                    — Health check
 *   GET  /ifttt/v1/user/info                                 — User identity
 *   POST /ifttt/v1/triggers/{slug}                           — Trigger polling
 *   DELETE /ifttt/v1/triggers/{slug}/trigger_identity/{id}   — Trigger identity cleanup
 *   POST /ifttt/v1/actions/{slug}                            — Action execution
 *   POST /ifttt/v1/actions/{slug}/fields/{field}/options     — Action dynamic field options
 *   POST /ifttt/v1/triggers/{slug}/fields/{field}/options    — Trigger dynamic field options
 *   POST /ifttt/v1/triggers/{slug}/fields/{field}/validate  — Trigger field validation
 *   POST /ifttt/v1/queries/{slug}                            — Query data retrieval
 *   GET  /oauth/authorize                                    — OAuth authorization page
 *   POST /oauth/authorize                                    — OAuth authorization submit
 *   POST /oauth/approve                                      — OAuth approval (after OTP)
 *   POST /oauth/token                                        — OAuth token exchange
 *   POST /api/events/push                                    — Desktop pushes trigger events
 *   GET  /api/queue/pending                                  — Desktop polls queued actions
 *   POST /api/queue/ack                                      — Desktop acknowledges action
 *   POST /api/field-options/push                             — Desktop pushes field option cache
 *   GET  /api/ifttt-status                                   — Desktop checks IFTTT connection status
 *   POST /api/ifttt-disconnect                               — Desktop disconnects IFTTT
 *   GET  /api/action-secret                                  — Desktop retrieves per-subdomain action secret
 */

import { handleStatus } from './ifttt/status';
import { handleTestSetup } from './ifttt/test-setup';
import { handleUserInfo } from './ifttt/user-info';
import { handleTrigger, handleTriggerIdentityDelete } from './ifttt/triggers';
import { handleAction } from './ifttt/actions';
import { handleQuery } from './ifttt/queries';
import { handleFieldOptions, handleTriggerFieldOptions, handleTriggerFieldValidation } from './ifttt/field-options';
import {
  handleAuthorizeGet,
  handleAuthorizePost,
  handleApprove,
  handleTokenExchange,
} from './auth/oauth';
import { notifyRealtime } from './broker/realtime';
import type { Env, SubdomainData, TriggerEvent, IftttFieldOption, IftttUserData, ActionSecretData, ActionHistoryEntry } from './types';

// Re-export the Durable Object class
export { EventBroker } from './broker/event-broker';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, IFTTT-Service-Key, X-Request-ID, X-Management-Key, X-Subdomain',
  'Access-Control-Max-Age': '86400',
};

function withCors(response: Response): Response {
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    newResponse.headers.set(key, value);
  }
  newResponse.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return newResponse;
}

/**
 * Filter response headers to only include safe, non-sensitive headers.
 * Used by tunnel-test to avoid exposing server internals.
 */
const SAFE_HEADERS = new Set([
  'content-type',
  'content-length',
  'cache-control',
  'x-frame-options',
  'x-content-type-options',
  'x-xss-protection',
  'strict-transport-security',
  'date',
]);

function filterSafeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    if (SAFE_HEADERS.has(key.toLowerCase())) {
      result[key] = value;
    }
  }
  return result;
}

const ROBOTS_TXT = `User-agent: *
Disallow: /
`;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      return withCors(await handleRequest(request, env, ctx));
    } catch {
      return withCors(
        Response.json({ errors: [{ message: 'Internal server error' }] }, { status: 500 }),
      );
    }
  },
};

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/robots.txt') {
    return new Response(ROBOTS_TXT, {
      headers: { 'Content-Type': 'text/plain', 'X-Robots-Tag': 'noindex, nofollow, noarchive' },
    });
  }

  if (path.startsWith('/ifttt/v1/')) return routeIftttApi(path, request, env, ctx);
  if (path.startsWith('/oauth/')) return routeOAuth(path, request, env);
  if (path.startsWith('/api/')) return routeDesktopApi(path, request, env, ctx);

  return Response.json({ errors: [{ message: 'Not found' }] }, { status: 404 });
}

const IFTTT_STATIC_ROUTES: Record<string, Record<string, (r: Request, e: Env) => Response | Promise<Response>>> = {
  '/ifttt/v1/status': { GET: handleStatus },
  '/ifttt/v1/test/setup': { GET: handleTestSetup, POST: handleTestSetup },
  '/ifttt/v1/user/info': { GET: handleUserInfo },
};

function routeIftttApi(path: string, request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const staticHandler = IFTTT_STATIC_ROUTES[path]?.[request.method];
  if (staticHandler) return Promise.resolve(staticHandler(request, env));

  const triggerMatch = path.match(/^\/ifttt\/v1\/triggers\/([a-z_]+)$/);
  if (triggerMatch && request.method === 'POST') {
    return handleTrigger(triggerMatch[1], request, env);
  }

  const triggerIdMatch = path.match(/^\/ifttt\/v1\/triggers\/([a-z_]+)\/trigger_identity\/(.+)$/);
  if (triggerIdMatch && request.method === 'DELETE') {
    return handleTriggerIdentityDelete(triggerIdMatch[1], triggerIdMatch[2], request, env);
  }

  const triggerFieldMatch = path.match(/^\/ifttt\/v1\/triggers\/([a-z_]+)\/fields\/([a-z_]+)\/options$/);
  if (triggerFieldMatch && request.method === 'POST') {
    return handleTriggerFieldOptions(triggerFieldMatch[1], triggerFieldMatch[2], request, env, ctx);
  }

  const triggerFieldValidateMatch = path.match(/^\/ifttt\/v1\/triggers\/([a-z_]+)\/fields\/([a-z_]+)\/validate$/);
  if (triggerFieldValidateMatch && request.method === 'POST') {
    return handleTriggerFieldValidation(triggerFieldValidateMatch[1], triggerFieldValidateMatch[2], request, env);
  }

  const actionMatch = path.match(/^\/ifttt\/v1\/actions\/([a-z_]+)$/);
  if (actionMatch && request.method === 'POST') {
    return handleAction(actionMatch[1], request, env);
  }

  const fieldOptionsMatch = path.match(/^\/ifttt\/v1\/actions\/([a-z_]+)\/fields\/([a-z_]+)\/options$/);
  if (fieldOptionsMatch && request.method === 'POST') {
    return handleFieldOptions(fieldOptionsMatch[1], fieldOptionsMatch[2], request, env, ctx);
  }

  const queryMatch = /^\/ifttt\/v1\/queries\/([a-z_]+)$/.exec(path);
  if (queryMatch && request.method === 'POST') {
    return handleQuery(queryMatch[1], request, env);
  }

  return Promise.resolve(Response.json({ errors: [{ message: 'Not found' }] }, { status: 404 }));
}

function routeOAuth(path: string, request: Request, env: Env): Promise<Response> {
  if (path === '/oauth/authorize' && request.method === 'GET') {
    return Promise.resolve(handleAuthorizeGet(request));
  }
  if (path === '/oauth/authorize' && request.method === 'POST') {
    return handleAuthorizePost(request, env);
  }
  if (path === '/oauth/approve' && request.method === 'POST') {
    return handleApprove(request, env);
  }
  if (path === '/oauth/token' && request.method === 'POST') {
    return handleTokenExchange(request, env);
  }
  return Promise.resolve(Response.json({ errors: [{ message: 'Not found' }] }, { status: 404 }));
}

type DesktopHandler = (r: Request, e: Env, c: ExecutionContext) => Promise<Response>;

const DESKTOP_API_ROUTES: Record<string, Record<string, DesktopHandler>> = {
  '/api/events/push': { POST: handleEventPush },
  '/api/queue/pending': { GET: handleQueuePending },
  '/api/queue/ack': { POST: handleQueueAck },
  '/api/field-options/push': { POST: handleFieldOptionsPush },
  '/api/ifttt-status': { GET: handleIftttStatus },
  '/api/ifttt-disconnect': { POST: handleIftttDisconnect },
  '/api/action-secret': { GET: handleActionSecret },
  '/api/action-history': { GET: handleActionHistoryGet, POST: handleActionHistoryPush },
  '/api/trigger-history': { GET: handleTriggerHistory },
  '/api/tunnel-test': { GET: handleTunnelTest },
  '/api/subscriptions': { GET: handleSubscriptions },
};

function routeDesktopApi(path: string, request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const handler = DESKTOP_API_ROUTES[path]?.[request.method];
  if (handler) return handler(request, env, ctx);
  return Promise.resolve(Response.json({ errors: [{ message: 'Not found' }] }, { status: 404 }));
}

// --- Desktop API Handlers ---

/**
 * Validate management key from the X-Management-Key header.
 * Returns the subdomain if valid, or null.
 */
async function validateManagementKey(
  request: Request,
  env: Env,
): Promise<string | null> {
  const subdomain = request.headers.get('X-Subdomain');
  const managementKey = request.headers.get('X-Management-Key');

  if (!subdomain || !managementKey) return null;

  const subdomainData = await env.TUNNELS.get<SubdomainData>(
    `subdomain:${subdomain}`,
    'json',
  );
  if (!subdomainData) return null;

  // Validate management key hash (constant-time comparison)
  const keyHash = await sha256(managementKey);
  if (!subdomainData.management_key_hash || !constantTimeEqual(keyHash, subdomainData.management_key_hash)) return null;

  return subdomain;
}

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

async function handleEventPush(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const subdomain = await validateManagementKey(request, env);
  if (!subdomain) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const event = (await request.json()) as TriggerEvent;

  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  const response = await broker.fetch(
    new Request('https://broker/triggers/push', {
      method: 'POST',
      body: JSON.stringify(event),
    }),
  );

  const result = await response.json();

  // Fire-and-forget: notify IFTTT to poll immediately
  ctx.waitUntil(notifyRealtime(subdomain, env));

  return Response.json(result);
}

async function handleQueuePending(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const subdomain = await validateManagementKey(request, env);
  if (!subdomain) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  const response = await broker.fetch(
    new Request('https://broker/queue/pending', { method: 'GET' }),
  );

  return new Response(response.body, response);
}

async function handleQueueAck(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const subdomain = await validateManagementKey(request, env);
  if (!subdomain) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  const response = await broker.fetch(
    new Request('https://broker/queue/ack', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );

  return new Response(response.body, response);
}

async function handleFieldOptionsPush(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const subdomain = await validateManagementKey(request, env);
  if (!subdomain) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { fields } = (await request.json()) as {
    fields: Record<string, IftttFieldOption[]>;
  };

  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  // Push all field options in parallel
  await Promise.all(
    Object.entries(fields).map(([fieldSlug, options]) =>
      broker.fetch(
        new Request('https://broker/field-options/set', {
          method: 'POST',
          body: JSON.stringify({ field_slug: fieldSlug, options }),
        }),
      ),
    ),
  );

  return Response.json({ stored: true });
}

async function handleIftttStatus(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const subdomain = await validateManagementKey(request, env);
  if (!subdomain) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userData = await env.IFTTT_TOKENS.get<IftttUserData>(`user:${subdomain}`, 'json');

  return Response.json({
    connected: userData?.connected ?? false,
    connected_at: userData?.connected_at ?? null,
  });
}

async function handleIftttDisconnect(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const subdomain = await validateManagementKey(request, env);
  if (!subdomain) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Clean up: remove action secret and mark as disconnected
  await Promise.all([
    env.IFTTT_TOKENS.put(
      `user:${subdomain}`,
      JSON.stringify({ connected: false, connected_at: null }),
    ),
    env.IFTTT_TOKENS.delete(`action-secret:${subdomain}`),
  ]);

  return Response.json({ disconnected: true });
}

/**
 * GET /api/action-secret
 * Returns the per-subdomain action secret for the desktop to write to disk.
 * Management-key protected.
 */
async function handleActionSecret(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const subdomain = await validateManagementKey(request, env);
  if (!subdomain) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secretData = await env.IFTTT_TOKENS.get<ActionSecretData>(
    `action-secret:${subdomain}`,
    'json',
  );

  if (!secretData) {
    return Response.json({ error: 'No action secret found' }, { status: 404 });
  }

  return Response.json({ secret: secretData.secret });
}

/**
 * GET /api/tunnel-test
 * Tests tunnel connectivity by pinging the Flask backend through Cloudflare.
 * Returns detailed diagnostics about what's working/failing.
 * Management-key protected.
 */
async function handleTunnelTest(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const subdomain = await validateManagementKey(request, env);
  if (!subdomain) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the action secret to authenticate with Flask middleware
  const secretData = await env.IFTTT_TOKENS.get<ActionSecretData>(
    `action-secret:${subdomain}`,
    'json',
  );

  const tunnelUrl = `https://${subdomain}.eclosion.me/ifttt/ping`;
  const startTime = Date.now();

  try {
    const headers: Record<string, string> = { 'User-Agent': 'Eclosion-IFTTT-Worker/1.0' };
    if (secretData?.secret) {
      headers['X-IFTTT-Action-Secret'] = secretData.secret;
    }

    const response = await fetch(tunnelUrl, {
      method: 'GET',
      headers,
    });

    const latency = Date.now() - startTime;
    const body = await response.text();

    // Only return safe headers to avoid exposing server internals
    const safeHeaders = filterSafeHeaders(response.headers);

    return Response.json({
      success: response.ok,
      subdomain,
      url: tunnelUrl,
      status: response.status,
      statusText: response.statusText,
      latency,
      body: body.slice(0, 500), // Truncate for safety
      headers: safeHeaders,
    });
  } catch (err) {
    const latency = Date.now() - startTime;
    return Response.json({
      success: false,
      subdomain,
      url: tunnelUrl,
      error: err instanceof Error ? err.message : 'Unknown fetch error',
      latency,
    });
  }
}

/**
 * GET /api/action-history
 * Returns recent action execution history for display in the UI.
 * Management-key protected.
 */
async function handleActionHistoryGet(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const subdomain = await validateManagementKey(request, env);
  if (!subdomain) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  const response = await broker.fetch(
    new Request('https://broker/history/get', { method: 'GET' }),
  );

  return new Response(response.body, response);
}

/**
 * POST /api/action-history
 * Pushes an action execution result to history.
 * Used by desktop when executing queued actions.
 * Management-key protected.
 */
async function handleActionHistoryPush(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const subdomain = await validateManagementKey(request, env);
  if (!subdomain) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entry = (await request.json()) as ActionHistoryEntry;

  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  const response = await broker.fetch(
    new Request('https://broker/history/push', {
      method: 'POST',
      body: JSON.stringify(entry),
    }),
  );

  return new Response(response.body, response);
}

/**
 * GET /api/trigger-history
 * Returns recent trigger events (outbound to IFTTT) for display in the UI.
 * Shows what events the desktop has pushed for IFTTT to poll.
 * Management-key protected.
 */
async function handleTriggerHistory(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const subdomain = await validateManagementKey(request, env);
  if (!subdomain) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  const response = await broker.fetch(
    new Request('https://broker/triggers/history', { method: 'GET' }),
  );

  return new Response(response.body, response);
}

/**
 * GET /api/subscriptions
 * Returns active trigger subscriptions for this user.
 * Desktop uses this to know which categories to push events for.
 * Management-key protected.
 */
async function handleSubscriptions(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const subdomain = await validateManagementKey(request, env);
  if (!subdomain) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  const response = await broker.fetch(
    new Request('https://broker/subscriptions/list', { method: 'GET' }),
  );

  return new Response(response.body, response);
}
