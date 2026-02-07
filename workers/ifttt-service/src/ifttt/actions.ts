/**
 * IFTTT Action Endpoints
 *
 * POST /ifttt/v1/actions/{slug}
 *
 * Actions receive instructions from IFTTT and execute operations in the user's
 * Eclosion instance. If the instance is offline, the action is queued in the
 * EventBroker Durable Object for auto-execution when the desktop reconnects.
 *
 * Supported actions:
 * - budget_to: Add funds to a Monarch budget category
 * - budget_to_goal: Add funds to a savings goal
 * - move_funds: Move funds from one budget category to another
 */

import { resolveSubdomain, resolveSubdomainAndSecret } from '../auth/tokens';
import { proxyToTunnel } from '../proxy/tunnel-proxy';
import type { Env, IftttActionRequest, QueuedAction, ActionHistoryEntry } from '../types';
import { isDemoSubdomain } from '../types';

interface RateLimitResponse {
  allowed: boolean;
  current: number;
  limit: number;
  retry_after_ms?: number;
}

export async function handleAction(
  slug: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const testMode = request.headers.get('IFTTT-Test-Mode') === '1';

  // Authenticate via Bearer token first (needed for all modes)
  const subdomain = await resolveSubdomain(request, env);
  if (!subdomain) {
    return Response.json(
      { errors: [{ message: 'Invalid or expired access token' }] },
      { status: 401 },
    );
  }

  const body = (await request.json()) as IftttActionRequest;

  // Validate actionFields key is present (applies to all modes including test)
  if (!body.actionFields) {
    return Response.json(
      { errors: [{ message: 'Missing actionFields' }] },
      { status: 400 },
    );
  }

  // Validate required fields per action (before test mode return)
  const fieldError = validateActionFields(slug, body.actionFields);
  if (fieldError) {
    return Response.json(
      { errors: [{ message: fieldError }] },
      { status: 400 },
    );
  }

  // Test mode: return success after validation
  if (testMode) {
    return Response.json({
      data: [{ id: `test-${slug}-${Date.now()}` }],
    });
  }

  // Production mode: need action secret for tunnel proxy
  const { actionSecret } = await resolveSubdomainAndSecret(request, env);

  if (!actionSecret) {
    return Response.json(
      { errors: [{ message: 'IFTTT connection not properly configured. Please reconnect.' }] },
      { status: 403 },
    );
  }

  // Demo subdomain: return success without proxying to a tunnel
  if (isDemoSubdomain(subdomain)) {
    return Response.json({
      data: [{ id: `demo-${slug}-${Date.now()}` }],
    });
  }

  // Check rate limit before processing (defense-in-depth against IFTTT account compromise)
  const rateLimitResult = await checkRateLimit(subdomain, env);
  if (!rateLimitResult.allowed) {
    const retryAfterSeconds = Math.ceil((rateLimitResult.retry_after_ms ?? 60000) / 1000);
    return Response.json(
      {
        errors: [{
          message: `Rate limit exceeded (${rateLimitResult.current}/${rateLimitResult.limit} actions per minute). Please wait ${retryAfterSeconds} seconds.`,
        }],
      },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSeconds) },
      },
    );
  }

  const requestId = request.headers.get('X-Request-ID') ?? crypto.randomUUID();

  switch (slug) {
    case 'budget_to':
      return handleBudgetTo(subdomain, body, requestId, actionSecret, env);
    case 'budget_to_goal':
      return handleBudgetToGoal(subdomain, body, requestId, actionSecret, env);
    case 'move_funds':
      return handleMoveFunds(subdomain, body, requestId, actionSecret, env);
    default:
      return Response.json(
        { errors: [{ message: `Unknown action: ${slug}` }] },
        { status: 404 },
      );
  }
}

function validateActionFields(slug: string, fields: Record<string, string>): string | null {
  switch (slug) {
    case 'budget_to':
      if (!fields.category) return 'Missing required action field: category';
      if (!fields.amount) return 'Missing required action field: amount';
      return null;
    case 'budget_to_goal':
      if (!fields.goal) return 'Missing required action field: goal';
      if (!fields.amount) return 'Missing required action field: amount';
      return null;
    case 'move_funds':
      if (!fields.source_category) return 'Missing required action field: source_category';
      if (!fields.destination_category) return 'Missing required action field: destination_category';
      if (!fields.amount) return 'Missing required action field: amount';
      return null;
    default:
      return null;
  }
}

async function handleBudgetTo(
  subdomain: string,
  body: IftttActionRequest,
  requestId: string,
  actionSecret: string,
  env: Env,
): Promise<Response> {
  const categoryId = body.actionFields.category;
  const amount = parseFloat(body.actionFields.amount);

  if (!categoryId || Number.isNaN(amount) || amount <= 0) {
    return Response.json(
      { errors: [{ message: 'Valid category and positive amount are required' }] },
      { status: 400 },
    );
  }

  // Try to proxy to the user's tunnel
  const result = await proxyToTunnel(
    subdomain,
    '/ifttt/actions/budget-to',
    { category_id: categoryId, amount },
    actionSecret,
  );

  if (result.online && result.data?.success) {
    await pushHistory(subdomain, 'budget_to', body.actionFields, true, undefined, undefined, env);
    return Response.json({
      data: [{ id: `budget-to-${Date.now()}` }],
    });
  }

  if (!result.online) {
    // Queue for offline execution
    return queueAction(subdomain, 'budget_to', body.actionFields, requestId, env);
  }

  // Online but failed
  const errorMsg = (result.data?.error as string) ?? 'Failed to allocate funds';
  await pushHistory(subdomain, 'budget_to', body.actionFields, false, errorMsg, result.proxyError, env);
  return Response.json(
    { errors: [{ message: errorMsg }] },
    { status: 500 },
  );
}

async function handleBudgetToGoal(
  subdomain: string,
  body: IftttActionRequest,
  requestId: string,
  actionSecret: string,
  env: Env,
): Promise<Response> {
  const goalId = body.actionFields.goal;
  const amount = parseFloat(body.actionFields.amount);

  if (!goalId || Number.isNaN(amount) || amount <= 0) {
    return Response.json(
      { errors: [{ message: 'Valid goal and positive amount are required' }] },
      { status: 400 },
    );
  }

  // Try to proxy to the user's tunnel
  const result = await proxyToTunnel(
    subdomain,
    '/ifttt/actions/budget-to-goal',
    { goal_id: goalId, amount },
    actionSecret,
  );

  if (result.online && result.data?.success) {
    await pushHistory(subdomain, 'budget_to_goal', body.actionFields, true, undefined, undefined, env);
    return Response.json({
      data: [{ id: `budget-to-goal-${Date.now()}` }],
    });
  }

  if (!result.online) {
    // Queue for offline execution
    return queueAction(subdomain, 'budget_to_goal', body.actionFields, requestId, env);
  }

  const errorMsg = (result.data?.error as string) ?? 'Failed to budget funds';
  await pushHistory(subdomain, 'budget_to_goal', body.actionFields, false, errorMsg, result.proxyError, env);
  return Response.json(
    { errors: [{ message: errorMsg }] },
    { status: 500 },
  );
}

async function handleMoveFunds(
  subdomain: string,
  body: IftttActionRequest,
  requestId: string,
  actionSecret: string,
  env: Env,
): Promise<Response> {
  const sourceId = body.actionFields.source_category;
  const destId = body.actionFields.destination_category;
  const amount = Number.parseFloat(body.actionFields.amount);

  if (!sourceId || !destId || Number.isNaN(amount) || amount <= 0) {
    return Response.json(
      { errors: [{ message: 'Valid source category, destination category, and positive amount are required' }] },
      { status: 400 },
    );
  }

  if (sourceId === destId) {
    return Response.json(
      { errors: [{ message: 'Source and destination categories must be different' }] },
      { status: 400 },
    );
  }

  const result = await proxyToTunnel(
    subdomain,
    '/ifttt/actions/move-funds',
    { source_category_id: sourceId, destination_category_id: destId, amount },
    actionSecret,
  );

  if (result.online && result.data?.success) {
    await pushHistory(subdomain, 'move_funds', body.actionFields, true, undefined, undefined, env);
    return Response.json({
      data: [{ id: `move-funds-${Date.now()}` }],
    });
  }

  if (!result.online) {
    return queueAction(subdomain, 'move_funds', body.actionFields, requestId, env);
  }

  const errorMsg = (result.data?.error as string) ?? 'Failed to move funds';
  await pushHistory(subdomain, 'move_funds', body.actionFields, false, errorMsg, result.proxyError, env);
  return Response.json(
    { errors: [{ message: errorMsg }] },
    { status: 500 },
  );
}

/**
 * Queue an action in the EventBroker for offline execution.
 * Returns success to IFTTT so the applet doesn't fail.
 */
async function queueAction(
  subdomain: string,
  actionSlug: string,
  fields: Record<string, string>,
  requestId: string,
  env: Env,
): Promise<Response> {
  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  const queuedAction: QueuedAction = {
    id: crypto.randomUUID(),
    action_slug: actionSlug,
    fields,
    queued_at: Date.now(),
    ifttt_request_id: requestId,
  };

  const brokerResponse = await broker.fetch(
    new Request('https://broker/queue/push', {
      method: 'POST',
      body: JSON.stringify(queuedAction),
    }),
  );

  const result = (await brokerResponse.json()) as { id: string };

  // Return success to IFTTT — the action is accepted, just deferred
  return Response.json({
    data: [{ id: `queued-${result.id}` }],
  });
}

/**
 * Push an action execution result to history.
 * Called after direct execution (not queuing).
 */
async function pushHistory(
  subdomain: string,
  actionSlug: string,
  fields: Record<string, string>,
  success: boolean,
  error: string | undefined,
  proxyError: string | undefined,
  env: Env,
): Promise<void> {
  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  const entry: ActionHistoryEntry = {
    id: crypto.randomUUID(),
    action_slug: actionSlug,
    fields,
    executed_at: Date.now(),
    success,
    error,
    proxy_error: proxyError,
    was_queued: false,
  };

  await broker.fetch(
    new Request('https://broker/history/push', {
      method: 'POST',
      body: JSON.stringify(entry),
    }),
  );
}

/**
 * Check rate limit for action execution.
 * Returns whether the action is allowed and current usage stats.
 */
async function checkRateLimit(subdomain: string, env: Env): Promise<RateLimitResponse> {
  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  const response = await broker.fetch(
    new Request('https://broker/rate-limit/check', {
      method: 'POST',
    }),
  );

  const result: RateLimitResponse = await response.json();
  return result;
}
