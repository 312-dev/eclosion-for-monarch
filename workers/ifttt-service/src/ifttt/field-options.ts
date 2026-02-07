/**
 * IFTTT Dynamic Field Options
 *
 * POST /ifttt/v1/actions/{action_slug}/fields/{field_slug}/options
 *
 * Returns dynamic dropdown options for action fields.
 * Proxies to the user's tunnel for live data, falls back to cached options
 * in the EventBroker if the tunnel is offline.
 */

import { resolveSubdomain, resolveSubdomainAndSecret } from '../auth/tokens';
import { proxyFieldOptions } from '../proxy/tunnel-proxy';
import type { Env, IftttFieldOption } from '../types';
import { isDemoSubdomain } from '../types';

export async function handleFieldOptions(
  actionSlug: string,
  fieldSlug: string,
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const testMode = request.headers.get('IFTTT-Test-Mode') === '1';

  // Test mode only needs auth, not the action secret
  if (testMode) {
    const subdomain = await resolveSubdomain(request, env);
    if (!subdomain) {
      return Response.json(
        { errors: [{ message: 'Invalid or expired access token' }] },
        { status: 401 },
      );
    }
    const testData = TEST_FIELD_OPTIONS[fieldSlug] ?? [];
    return Response.json({ data: testData });
  }

  // Authenticate + fetch action secret in parallel
  const { subdomain, actionSecret } = await resolveSubdomainAndSecret(request, env);
  if (!subdomain) {
    return Response.json(
      { errors: [{ message: 'Invalid or expired access token' }] },
      { status: 401 },
    );
  }

  if (!actionSecret) {
    return Response.json(
      { errors: [{ message: 'IFTTT connection not properly configured. Please reconnect.' }] },
      { status: 403 },
    );
  }

  // Demo subdomain: return mock field options without proxying to a tunnel
  if (isDemoSubdomain(subdomain)) {
    const demoData = TEST_FIELD_OPTIONS[fieldSlug] ?? [];
    return Response.json({ data: demoData });
  }

  // Map action+field to the Flask endpoint
  const fieldKey = `${actionSlug}:${fieldSlug}`;
  const flaskPath = getFlaskFieldPath(fieldKey);

  if (!flaskPath) {
    return Response.json(
      { errors: [{ message: `Unknown field: ${fieldSlug}` }] },
      { status: 404 },
    );
  }

  // Try live data from tunnel
  const result = await proxyFieldOptions(subdomain, flaskPath, actionSecret);

  if (result.online && result.data) {
    // Fire-and-forget: cache the result for offline fallback
    const options = (result.data as { data: IftttFieldOption[] }).data;
    if (Array.isArray(options)) {
      ctx.waitUntil(cacheFieldOptions(subdomain, fieldSlug, options, env));
    }
    return Response.json(result.data);
  }

  // Tunnel offline — serve from cache
  return getCachedFieldOptions(subdomain, fieldSlug, env);
}

export async function handleTriggerFieldOptions(
  triggerSlug: string,
  fieldSlug: string,
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const testMode = request.headers.get('IFTTT-Test-Mode') === '1';

  // Test mode only needs auth, not the action secret
  if (testMode) {
    const subdomain = await resolveSubdomain(request, env);
    if (!subdomain) {
      return Response.json(
        { errors: [{ message: 'Invalid or expired access token' }] },
        { status: 401 },
      );
    }
    const testData = TEST_FIELD_OPTIONS[fieldSlug] ?? [];
    return Response.json({ data: testData });
  }

  // Authenticate + fetch action secret in parallel
  const { subdomain, actionSecret } = await resolveSubdomainAndSecret(request, env);
  if (!subdomain) {
    return Response.json(
      { errors: [{ message: 'Invalid or expired access token' }] },
      { status: 401 },
    );
  }

  if (!actionSecret) {
    return Response.json(
      { errors: [{ message: 'IFTTT connection not properly configured. Please reconnect.' }] },
      { status: 403 },
    );
  }

  // Demo subdomain: return mock field options without proxying to a tunnel
  if (isDemoSubdomain(subdomain)) {
    const demoData = TEST_FIELD_OPTIONS[fieldSlug] ?? [];
    return Response.json({ data: demoData });
  }

  const fieldKey = `${triggerSlug}:${fieldSlug}`;

  // Serve static options directly (no tunnel needed)
  const staticOptions = STATIC_TRIGGER_FIELD_OPTIONS[fieldKey];
  if (staticOptions) {
    return Response.json({ data: staticOptions });
  }

  const flaskPath = getTriggerFlaskFieldPath(fieldKey);

  if (!flaskPath) {
    return Response.json(
      { errors: [{ message: `Unknown trigger field: ${fieldSlug}` }] },
      { status: 404 },
    );
  }

  const result = await proxyFieldOptions(subdomain, flaskPath, actionSecret);

  if (result.online && result.data) {
    // Fire-and-forget: cache the result for offline fallback
    const options = (result.data as { data: IftttFieldOption[] }).data;
    if (Array.isArray(options)) {
      ctx.waitUntil(cacheFieldOptions(subdomain, fieldSlug, options, env));
    }
    return Response.json(result.data);
  }

  return getCachedFieldOptions(subdomain, fieldSlug, env);
}

/**
 * Trigger field validation.
 * IFTTT calls this to validate text input values entered by the user.
 * Always responds with 200 — valid/invalid is conveyed in the response body.
 */
export async function handleTriggerFieldValidation(
  triggerSlug: string,
  fieldSlug: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const subdomain = await resolveSubdomain(request, env);
  if (!subdomain) {
    return Response.json(
      { errors: [{ message: 'Invalid or expired access token' }] },
      { status: 401 },
    );
  }

  const body = (await request.json()) as { value: string };
  const value = body.value?.trim() ?? '';

  const fieldKey = `${triggerSlug}:${fieldSlug}`;
  const rule = VALIDATION_RULES[fieldKey];

  if (!rule) {
    // No validation configured for this field — accept anything
    return Response.json({ data: { valid: true } });
  }

  const result = rule(value);
  return Response.json({ data: result });
}

export type ValidationResult = { valid: boolean; message?: string };

export const VALIDATION_RULES: Record<string, (value: string) => ValidationResult> = {
  'under_budget:threshold_percent': (value) => {
    if (value === '') return { valid: true }; // Optional field
    const num = Number.parseInt(value, 10);
    if (Number.isNaN(num) || num < 1 || num > 100) {
      return { valid: false, message: 'Must be a whole number between 1 and 100' };
    }
    return { valid: true };
  },
  'budget_surplus:minimum_amount': (value) => {
    if (value === '') return { valid: true }; // Optional field
    const num = Number.parseInt(value, 10);
    if (Number.isNaN(num) || num <= 0) {
      return { valid: false, message: 'Must be a positive whole number' };
    }
    return { valid: true };
  },
  'category_balance_threshold:threshold_amount': (value) => {
    const num = Number.parseInt(value, 10);
    if (Number.isNaN(num) || num <= 0) {
      return { valid: false, message: 'Must be a positive whole number' };
    }
    return { valid: true };
  },
  'spending_streak:streak_months': (value) => {
    const num = Number.parseInt(value, 10);
    if (Number.isNaN(num) || num < 2) {
      return { valid: false, message: 'Must be a whole number of 2 or more' };
    }
    return { valid: true };
  },
};

function getFlaskFieldPath(fieldKey: string): string | null {
  const pathMap: Record<string, string> = {
    'budget_to:category': '/ifttt/field-options/category',
    'budget_to_goal:goal': '/ifttt/field-options/goal',
    'move_funds:source_category': '/ifttt/field-options/category',
    'move_funds:destination_category': '/ifttt/field-options/category',
  };
  return pathMap[fieldKey] ?? null;
}

/** Static field options served directly from the worker (no tunnel needed). */
const STATIC_TRIGGER_FIELD_OPTIONS: Record<string, IftttFieldOption[]> = {
  'category_balance_threshold:direction': [
    { label: 'Reaches or exceeds', value: 'above' },
    { label: 'Drops below', value: 'below' },
  ],
  'new_charge:include_pending': [
    { label: 'Include pending transactions', value: 'include_pending' },
  ],
};

function getTriggerFlaskFieldPath(fieldKey: string): string | null {
  // Check for static options first
  if (STATIC_TRIGGER_FIELD_OPTIONS[fieldKey]) {
    return null; // Handled inline, not proxied
  }

  const pathMap: Record<string, string> = {
    'goal_achieved:goal_name': '/ifttt/field-options/goal',
    'under_budget:category': '/ifttt/field-options/category',
    'category_balance_threshold:category': '/ifttt/field-options/category',
    'spending_streak:category': '/ifttt/field-options/category',
    // new_charge uses category-all to show ALL categories without flexible group roll-ups
    // (we want to detect charges in specific categories, not budget to/from them)
    'new_charge:category': '/ifttt/field-options/category-all',
  };
  return pathMap[fieldKey] ?? null;
}

async function cacheFieldOptions(
  subdomain: string,
  fieldSlug: string,
  options: IftttFieldOption[],
  env: Env,
): Promise<void> {
  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  await broker.fetch(
    new Request('https://broker/field-options/set', {
      method: 'POST',
      body: JSON.stringify({ field_slug: fieldSlug, options }),
    }),
  );
}

const TEST_CATEGORY_OPTIONS: IftttFieldOption[] = [
  { label: 'Groceries', value: 'cat:test-category-groceries' },
  { label: 'Rent', value: 'cat:test-category-rent' },
  { label: 'Utilities', value: 'cat:test-category-utilities' },
  { label: 'Monthly Bills (Flexible)', value: 'group:test-group-monthly-bills' },
];

const TEST_GOAL_OPTIONS: IftttFieldOption[] = [
  { label: 'Emergency Fund', value: 'test-goal-emergency' },
  { label: 'Vacation Fund', value: 'test-goal-vacation' },
  { label: 'New Car', value: 'test-goal-car' },
];

const TEST_FIELD_OPTIONS: Record<string, IftttFieldOption[]> = {
  category: TEST_CATEGORY_OPTIONS,
  source_category: TEST_CATEGORY_OPTIONS,
  destination_category: TEST_CATEGORY_OPTIONS,
  goal: TEST_GOAL_OPTIONS,
  goal_name: TEST_GOAL_OPTIONS,
  direction: [
    { label: 'Reaches or exceeds', value: 'above' },
    { label: 'Drops below', value: 'below' },
  ],
  include_pending: [
    { label: 'Include pending transactions', value: 'include_pending' },
  ],
};

async function getCachedFieldOptions(
  subdomain: string,
  fieldSlug: string,
  env: Env,
): Promise<Response> {
  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  const response = await broker.fetch(
    new Request('https://broker/field-options/get', {
      method: 'POST',
      body: JSON.stringify({ field_slug: fieldSlug }),
    }),
  );

  const result = (await response.json()) as { data: IftttFieldOption[] };

  return Response.json({ data: result.data });
}
