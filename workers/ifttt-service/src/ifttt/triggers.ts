/**
 * IFTTT Trigger Endpoints
 *
 * POST /ifttt/v1/triggers/{slug}
 *
 * Triggers return recent events that IFTTT polls for (approximately hourly).
 * Events are stored in the EventBroker Durable Object, pushed by the desktop
 * app during sync operations.
 *
 * Supported triggers:
 * - goal_achieved: Fires when a savings goal reaches 100% of its target
 * - under_budget: Fires when a category's spending is under budget
 * - budget_surplus: Fires when total spending is under total planned budget
 * - category_balance_threshold: Fires when a category balance crosses a threshold
 * - under_budget_streak: Fires when a category stays under budget for N consecutive months
 * - new_charge: Fires when a new expense transaction appears
 */

import { resolveSubdomain } from '../auth/tokens';
import type { Env, IftttTriggerRequest, TriggerEvent, TriggerSubscription } from '../types';

type TriggerDataItem = Record<string, unknown> & {
  meta: { id: string; timestamp: number };
};

/**
 * Build a paginated IFTTT trigger response.
 * Slices data to limit, adds cursor when more items exist.
 */
function buildPaginatedResponse(
  allData: TriggerDataItem[],
  limit: number,
): Response {
  const page = allData.slice(0, limit);
  const hasMore = allData.length > limit;

  if (hasMore && page.length > 0) {
    return Response.json({ data: page, cursor: page[page.length - 1].meta.id });
  }

  return Response.json({ data: page });
}

export async function handleTrigger(
  slug: string,
  request: Request,
  env: Env,
): Promise<Response> {
  // Authenticate via Bearer token
  const subdomain = await resolveSubdomain(request, env);
  if (!subdomain) {
    return Response.json(
      { errors: [{ message: 'Invalid or expired access token' }] },
      { status: 401 },
    );
  }

  const body = (await request.json()) as IftttTriggerRequest;
  const limit = body.limit ?? 50;
  const testMode = request.headers.get('IFTTT-Test-Mode') === '1';

  // Validate triggerFields key is present
  if (!body.triggerFields) {
    return Response.json(
      { errors: [{ message: 'Missing required field: triggerFields' }] },
      { status: 400 },
    );
  }

  // Store subscription for this trigger (so desktop knows what events to push)
  // Skip in test mode since those are ephemeral IFTTT verification requests
  if (!testMode && body.trigger_identity) {
    await storeSubscription(subdomain, slug, body.trigger_identity, body.triggerFields, env);
  }

  switch (slug) {
    case 'goal_achieved': {
      if (!body.triggerFields.goal_name) {
        return Response.json(
          { errors: [{ message: 'Missing required trigger field: goal_name' }] },
          { status: 400 },
        );
      }
      return handleGoalAchieved(subdomain, limit, testMode, env);
    }
    case 'under_budget': {
      if (!body.triggerFields.category) {
        return Response.json(
          { errors: [{ message: 'Missing required trigger field: category' }] },
          { status: 400 },
        );
      }
      return handleUnderBudget(subdomain, limit, body.triggerFields, testMode, env);
    }
    case 'budget_surplus': {
      if (!body.triggerFields.minimum_amount) {
        return Response.json(
          { errors: [{ message: 'Missing required trigger field: minimum_amount' }] },
          { status: 400 },
        );
      }
      return handleBudgetSurplus(subdomain, limit, testMode, env);
    }
    case 'category_balance_threshold': {
      if (!body.triggerFields.category) {
        return Response.json(
          { errors: [{ message: 'Missing required trigger field: category' }] },
          { status: 400 },
        );
      }
      return handleCategoryBalanceThreshold(subdomain, limit, body.triggerFields, testMode, env);
    }
    case 'under_budget_streak': {
      if (!body.triggerFields.category) {
        return Response.json(
          { errors: [{ message: 'Missing required trigger field: category' }] },
          { status: 400 },
        );
      }
      return handleUnderBudgetStreak(subdomain, limit, body.triggerFields, testMode, env);
    }
    case 'new_charge': {
      if (!body.triggerFields.category) {
        return Response.json(
          { errors: [{ message: 'Missing required trigger field: category' }] },
          { status: 400 },
        );
      }
      return handleNewCharge(subdomain, limit, body.triggerFields, testMode, env);
    }
    default:
      return Response.json(
        { errors: [{ message: `Unknown trigger: ${slug}` }] },
        { status: 404 },
      );
  }
}

/**
 * Handle trigger identity deletion.
 * IFTTT calls this when a user disables an applet.
 */
export async function handleTriggerIdentityDelete(
  slug: string,
  triggerIdentity: string,
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

  // Remove subscription so desktop stops pushing events for this trigger
  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  await broker.fetch(
    new Request('https://broker/subscriptions/delete', {
      method: 'POST',
      body: JSON.stringify({ trigger_slug: slug, trigger_identity: triggerIdentity }),
    }),
  );

  return new Response(null, { status: 200 });
}

async function fetchTriggerEvents(
  subdomain: string,
  triggerSlug: string,
  limit: number,
  env: Env,
): Promise<TriggerEvent[]> {
  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  const brokerResponse = await broker.fetch(
    new Request('https://broker/triggers/get', {
      method: 'POST',
      body: JSON.stringify({ trigger_slug: triggerSlug, limit }),
    }),
  );

  const { events } = (await brokerResponse.json()) as { events: TriggerEvent[] };
  return events;
}

/**
 * Store a trigger subscription so desktop knows what events to push.
 * Called on each poll to keep subscriptions up-to-date.
 */
async function storeSubscription(
  subdomain: string,
  triggerSlug: string,
  triggerIdentity: string,
  triggerFields: Record<string, string>,
  env: Env,
): Promise<void> {
  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  const subscription: TriggerSubscription = {
    trigger_identity: triggerIdentity,
    trigger_slug: triggerSlug,
    fields: triggerFields,
    subscribed_at: Date.now(),
  };

  await broker.fetch(
    new Request('https://broker/subscriptions/set', {
      method: 'POST',
      body: JSON.stringify(subscription),
    }),
  );
}

async function handleUnderBudget(
  subdomain: string,
  limit: number,
  triggerFields: Record<string, string>,
  testMode: boolean,
  env: Env,
): Promise<Response> {
  const events = await fetchTriggerEvents(subdomain, 'under_budget', limit, env);

  // Filter by configured category if provided
  let filtered = events;
  if (triggerFields?.category) {
    filtered = events.filter((e) => e.data.category_id === triggerFields.category);
  }

  const data: TriggerDataItem[] = filtered.map((event) => ({
    category_name: event.data.category_name,
    budget_amount: event.data.budget_amount,
    actual_spending: event.data.actual_spending,
    amount_saved: event.data.amount_saved,
    percent_saved: event.data.percent_saved,
    created_at: new Date(event.timestamp * 1000).toISOString(),
    meta: { id: event.id, timestamp: event.timestamp },
  }));

  if (testMode && data.length === 0) {
    const now = Math.floor(Date.now() / 1000);
    const sampleData: TriggerDataItem[] = [
      { category_name: 'Groceries', budget_amount: '500', actual_spending: '420', amount_saved: '80', percent_saved: '16', created_at: new Date(now * 1000).toISOString(), meta: { id: `test-ub-1-${now}`, timestamp: now } },
      { category_name: 'Dining Out', budget_amount: '300', actual_spending: '210', amount_saved: '90', percent_saved: '30', created_at: new Date((now - 86400) * 1000).toISOString(), meta: { id: `test-ub-2-${now}`, timestamp: now - 86400 } },
      { category_name: 'Entertainment', budget_amount: '200', actual_spending: '150', amount_saved: '50', percent_saved: '25', created_at: new Date((now - 172800) * 1000).toISOString(), meta: { id: `test-ub-3-${now}`, timestamp: now - 172800 } },
    ];
    return buildPaginatedResponse(sampleData, limit);
  }

  return buildPaginatedResponse(data, limit);
}

async function handleBudgetSurplus(
  subdomain: string,
  limit: number,
  testMode: boolean,
  env: Env,
): Promise<Response> {
  const events = await fetchTriggerEvents(subdomain, 'budget_surplus', limit, env);

  const data: TriggerDataItem[] = events.map((event) => ({
    surplus_amount: event.data.surplus_amount,
    total_budget: event.data.total_budget,
    total_spent: event.data.total_spent,
    percent_saved: event.data.percent_saved,
    month: event.data.month,
    created_at: new Date(event.timestamp * 1000).toISOString(),
    meta: { id: event.id, timestamp: event.timestamp },
  }));

  if (testMode && data.length === 0) {
    const now = Math.floor(Date.now() / 1000);
    const sampleData: TriggerDataItem[] = [
      { surplus_amount: '150', total_budget: '3500', total_spent: '3350', percent_saved: '4', month: 'January 2026', created_at: new Date(now * 1000).toISOString(), meta: { id: `test-surplus-1-${now}`, timestamp: now } },
      { surplus_amount: '200', total_budget: '3500', total_spent: '3300', percent_saved: '6', month: 'December 2025', created_at: new Date((now - 2592000) * 1000).toISOString(), meta: { id: `test-surplus-2-${now}`, timestamp: now - 2592000 } },
      { surplus_amount: '300', total_budget: '3500', total_spent: '3200', percent_saved: '9', month: 'November 2025', created_at: new Date((now - 5184000) * 1000).toISOString(), meta: { id: `test-surplus-3-${now}`, timestamp: now - 5184000 } },
    ];
    return buildPaginatedResponse(sampleData, limit);
  }

  return buildPaginatedResponse(data, limit);
}

/**
 * Filter balance threshold events by category, threshold_amount, and direction.
 * Pure function extracted for testability.
 */
export function filterBalanceThresholdEvents(
  events: TriggerEvent[],
  triggerFields: Record<string, string>,
): TriggerEvent[] {
  let filtered = events;
  if (triggerFields?.category) {
    filtered = filtered.filter((e) => e.data.category_id === triggerFields.category);
  }
  if (triggerFields?.threshold_amount && triggerFields?.direction) {
    const threshold = Number.parseFloat(triggerFields.threshold_amount);
    const direction = triggerFields.direction;
    if (!Number.isNaN(threshold)) {
      filtered = filtered.filter((e) => {
        const balance = Number.parseFloat(e.data.current_balance);
        return direction === 'above' ? balance >= threshold : balance < threshold;
      });
    }
  }
  return filtered;
}

async function handleCategoryBalanceThreshold(
  subdomain: string,
  limit: number,
  triggerFields: Record<string, string>,
  testMode: boolean,
  env: Env,
): Promise<Response> {
  const events = await fetchTriggerEvents(subdomain, 'category_balance_threshold', limit, env);

  const filtered = filterBalanceThresholdEvents(events, triggerFields);

  const data: TriggerDataItem[] = filtered.map((event) => ({
    category_name: event.data.category_name,
    current_balance: event.data.current_balance,
    threshold_amount: triggerFields?.threshold_amount ?? '0',
    direction: triggerFields?.direction ?? 'above',
    created_at: new Date(event.timestamp * 1000).toISOString(),
    meta: { id: event.id, timestamp: event.timestamp },
  }));

  if (testMode && data.length === 0) {
    const now = Math.floor(Date.now() / 1000);
    const sampleData: TriggerDataItem[] = [
      { category_name: 'Fun Money', current_balance: '250', threshold_amount: '200', direction: 'above', created_at: new Date(now * 1000).toISOString(), meta: { id: `test-thresh-1-${now}`, timestamp: now } },
      { category_name: 'Groceries', current_balance: '80', threshold_amount: '100', direction: 'below', created_at: new Date((now - 86400) * 1000).toISOString(), meta: { id: `test-thresh-2-${now}`, timestamp: now - 86400 } },
      { category_name: 'Dining Out', current_balance: '350', threshold_amount: '300', direction: 'above', created_at: new Date((now - 172800) * 1000).toISOString(), meta: { id: `test-thresh-3-${now}`, timestamp: now - 172800 } },
    ];
    return buildPaginatedResponse(sampleData, limit);
  }

  return buildPaginatedResponse(data, limit);
}

async function handleUnderBudgetStreak(
  subdomain: string,
  limit: number,
  triggerFields: Record<string, string>,
  testMode: boolean,
  env: Env,
): Promise<Response> {
  const events = await fetchTriggerEvents(subdomain, 'under_budget_streak', limit, env);

  // Filter by category and minimum streak count
  let filtered = events;
  if (triggerFields?.category) {
    filtered = filtered.filter((e) => e.data.category_id === triggerFields.category);
  }
  if (triggerFields?.streak_months) {
    const minStreak = Number.parseInt(triggerFields.streak_months, 10);
    if (!Number.isNaN(minStreak)) {
      filtered = filtered.filter((e) => Number.parseInt(e.data.streak_count, 10) >= minStreak);
    }
  }

  const data: TriggerDataItem[] = filtered.map((event) => ({
    category_name: event.data.category_name,
    streak_count: event.data.streak_count,
    budget_amount: event.data.budget_amount,
    current_spending: event.data.current_spending,
    created_at: new Date(event.timestamp * 1000).toISOString(),
    meta: { id: event.id, timestamp: event.timestamp },
  }));

  if (testMode && data.length === 0) {
    const now = Math.floor(Date.now() / 1000);
    const sampleData: TriggerDataItem[] = [
      { category_name: 'Dining Out', streak_count: '3', budget_amount: '300', current_spending: '180', created_at: new Date(now * 1000).toISOString(), meta: { id: `test-streak-1-${now}`, timestamp: now } },
      { category_name: 'Groceries', streak_count: '5', budget_amount: '500', current_spending: '450', created_at: new Date((now - 86400) * 1000).toISOString(), meta: { id: `test-streak-2-${now}`, timestamp: now - 86400 } },
      { category_name: 'Entertainment', streak_count: '2', budget_amount: '200', current_spending: '150', created_at: new Date((now - 172800) * 1000).toISOString(), meta: { id: `test-streak-3-${now}`, timestamp: now - 172800 } },
    ];
    return buildPaginatedResponse(sampleData, limit);
  }

  return buildPaginatedResponse(data, limit);
}

async function handleNewCharge(
  subdomain: string,
  limit: number,
  triggerFields: Record<string, string>,
  testMode: boolean,
  env: Env,
): Promise<Response> {
  const events = await fetchTriggerEvents(subdomain, 'new_charge', limit, env);

  // Filter by category if configured
  let filtered = events;
  if (triggerFields?.category) {
    filtered = filtered.filter((e) => e.data.category_id === triggerFields.category);
  }

  // When "include pending" is checked, show ONLY pending transactions.
  // When unchecked, show ONLY posted transactions.
  // This prevents double-triggering when a pending transaction posts with a new ID.
  if (triggerFields?.include_pending) {
    filtered = filtered.filter((e) => e.data.is_pending === 'true');
  } else {
    filtered = filtered.filter((e) => e.data.is_pending !== 'true');
  }

  const data: TriggerDataItem[] = filtered.map((event) => ({
    amount: event.data.amount,
    merchant_name: event.data.merchant_name,
    category_name: event.data.category_name,
    is_pending: event.data.is_pending,
    date: event.data.date,
    created_at: new Date(event.timestamp * 1000).toISOString(),
    meta: { id: event.id, timestamp: event.timestamp },
  }));

  if (testMode && data.length === 0) {
    const now = Math.floor(Date.now() / 1000);
    const sampleData: TriggerDataItem[] = [
      { amount: '42', merchant_name: 'Whole Foods', category_name: 'Groceries', is_pending: 'false', date: new Date().toISOString().split('T')[0], created_at: new Date(now * 1000).toISOString(), meta: { id: `test-charge-1-${now}`, timestamp: now } },
      { amount: '15', merchant_name: 'Netflix', category_name: 'Subscriptions', is_pending: 'false', date: new Date().toISOString().split('T')[0], created_at: new Date((now - 3600) * 1000).toISOString(), meta: { id: `test-charge-2-${now}`, timestamp: now - 3600 } },
      { amount: '85', merchant_name: 'Shell Gas Station', category_name: 'Transportation', is_pending: 'true', date: new Date().toISOString().split('T')[0], created_at: new Date((now - 7200) * 1000).toISOString(), meta: { id: `test-charge-3-${now}`, timestamp: now - 7200 } },
    ];
    return buildPaginatedResponse(sampleData, limit);
  }

  return buildPaginatedResponse(data, limit);
}

async function handleGoalAchieved(
  subdomain: string,
  limit: number,
  testMode: boolean,
  env: Env,
): Promise<Response> {
  const events = await fetchTriggerEvents(subdomain, 'goal_achieved', limit, env);

  const data: TriggerDataItem[] = events.map((event) => ({
    goal_name: event.data.goal_name,
    target_amount: event.data.target_amount,
    achieved_at: event.data.achieved_at,
    created_at: new Date(event.timestamp * 1000).toISOString(),
    meta: {
      id: event.id,
      timestamp: event.timestamp,
    },
  }));

  // IFTTT test mode: return sample data when no real events exist
  if (testMode && data.length === 0) {
    const now = Math.floor(Date.now() / 1000);
    const sampleData: TriggerDataItem[] = [
      { goal_name: 'Emergency Fund', target_amount: '10000', achieved_at: new Date(now * 1000).toISOString(), created_at: new Date(now * 1000).toISOString(), meta: { id: `test-1-${now}`, timestamp: now } },
      { goal_name: 'Vacation Fund', target_amount: '3000', achieved_at: new Date((now - 86400) * 1000).toISOString(), created_at: new Date((now - 86400) * 1000).toISOString(), meta: { id: `test-2-${now}`, timestamp: now - 86400 } },
      { goal_name: 'New Car', target_amount: '25000', achieved_at: new Date((now - 172800) * 1000).toISOString(), created_at: new Date((now - 172800) * 1000).toISOString(), meta: { id: `test-3-${now}`, timestamp: now - 172800 } },
    ];
    return buildPaginatedResponse(sampleData, limit);
  }

  return buildPaginatedResponse(data, limit);
}
