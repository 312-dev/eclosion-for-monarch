/**
 * IFTTT Query Endpoints
 *
 * POST /ifttt/v1/queries/{slug}
 *
 * Queries return historical data for IFTTT to display. They're read-only
 * views into the EventBroker's stored trigger events.
 *
 * Supported queries:
 * - list_achieved_goals: Returns history of achieved savings goals
 * - list_category_budgets: Returns budget status for all categories (live)
 * - list_under_budget_categories: Returns under-budget categories (live)
 * - budget_summary: Returns monthly budget summary (live)
 */

import { resolveSubdomain, resolveSubdomainAndSecret } from '../auth/tokens';
import { proxyToTunnel } from '../proxy/tunnel-proxy';
import type { Env, TriggerEvent } from '../types';
import { isDemoSubdomain } from '../types';

interface IftttQueryRequest {
  limit?: number;
  cursor?: string;
  user?: {
    timezone: string;
  };
}

export async function handleQuery(
  slug: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const testMode = request.headers.get('IFTTT-Test-Mode') === '1';

  // Live queries need action secret for tunnel proxy
  const liveQueries = ['list_category_budgets', 'list_under_budget_categories', 'budget_summary'];

  if (liveQueries.includes(slug)) {
    return handleLiveQuery(slug, request, testMode, env);
  }

  // EventBroker-based queries only need bearer token
  const subdomain = await resolveSubdomain(request, env);
  if (!subdomain) {
    return Response.json(
      { errors: [{ message: 'Invalid or expired access token' }] },
      { status: 401 },
    );
  }

  const body = (await request.json()) as IftttQueryRequest;
  const limit = body.limit ?? 20;

  switch (slug) {
    case 'list_achieved_goals':
      return handleListAchievedGoals(subdomain, limit, body.cursor, testMode, env);
    default:
      return Response.json(
        { errors: [{ message: `Unknown query: ${slug}` }] },
        { status: 404 },
      );
  }
}

/**
 * Handle queries that need live data from the user's tunnel.
 * Proxies to Flask endpoints, with test mode fallback.
 */
async function handleLiveQuery(
  slug: string,
  request: Request,
  testMode: boolean,
  env: Env,
): Promise<Response> {
  if (testMode) {
    const subdomain = await resolveSubdomain(request, env);
    if (!subdomain) {
      return Response.json(
        { errors: [{ message: 'Invalid or expired access token' }] },
        { status: 401 },
      );
    }
    const body = (await request.clone().json()) as IftttQueryRequest;
    const limit = body.limit ?? 20;
    const allData = getTestQueryData(slug);
    const page = allData.slice(0, limit);
    if (allData.length > limit && page.length > 0) {
      return Response.json({ data: page, cursor: `test-cursor-${limit}` });
    }
    return Response.json({ data: page });
  }

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

  if (isDemoSubdomain(subdomain)) {
    return Response.json({ data: getTestQueryData(slug) });
  }

  const body = (await request.clone().json()) as IftttQueryRequest;

  const flaskPathMap: Record<string, string> = {
    list_category_budgets: '/ifttt/queries/category-budgets',
    list_under_budget_categories: '/ifttt/queries/under-budget-categories',
    budget_summary: '/ifttt/queries/budget-summary',
  };

  const flaskPath = flaskPathMap[slug];
  if (!flaskPath) {
    return Response.json(
      { errors: [{ message: `Unknown query: ${slug}` }] },
      { status: 404 },
    );
  }

  const result = await proxyToTunnel(
    subdomain,
    flaskPath,
    { limit: body.limit ?? 50, cursor: body.cursor },
    actionSecret,
  );

  if (result.online && result.data) {
    return Response.json(result.data);
  }

  if (!result.online) {
    // Tunnel offline — return empty data (queries can't be queued)
    return Response.json({ data: [] });
  }

  return Response.json(
    { errors: [{ message: 'Failed to fetch budget data' }] },
    { status: 500 },
  );
}

function getTestQueryData(slug: string): Record<string, string>[] {
  const now = new Date();
  switch (slug) {
    case 'list_category_budgets':
      return [
        { category_name: 'Groceries', group_name: 'Essentials', budget_amount: '500', actual_spending: '420', remaining: '80', rollover: '50', status: 'under_budget' },
        { category_name: 'Rent', group_name: 'Essentials', budget_amount: '1500', actual_spending: '1500', remaining: '0', rollover: '0', status: 'on_track' },
        { category_name: 'Dining Out', group_name: 'Discretionary', budget_amount: '300', actual_spending: '350', remaining: '-50', rollover: '0', status: 'over_budget' },
      ];
    case 'list_under_budget_categories':
      return [
        { category_name: 'Dining Out', budget_amount: '300', actual_spending: '210', amount_saved: '90', percent_saved: '30' },
        { category_name: 'Groceries', budget_amount: '500', actual_spending: '420', amount_saved: '80', percent_saved: '16' },
        { category_name: 'Entertainment', budget_amount: '200', actual_spending: '150', amount_saved: '50', percent_saved: '25' },
      ];
    case 'budget_summary': {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return [
        { month: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), planned_income: '5000', actual_income: '5200', planned_expenses: '3500', actual_expenses: '3350', surplus: '150', ready_to_assign: '50' },
        { month: prevMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), planned_income: '5000', actual_income: '4800', planned_expenses: '3500', actual_expenses: '3600', surplus: '-100', ready_to_assign: '0' },
        { month: twoMonthsAgo.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), planned_income: '5000', actual_income: '5100', planned_expenses: '3500', actual_expenses: '3200', surplus: '300', ready_to_assign: '100' },
      ];
    }
    default:
      return [];
  }
}

async function handleListAchievedGoals(
  subdomain: string,
  limit: number,
  cursor: string | undefined,
  testMode: boolean,
  env: Env,
): Promise<Response> {
  const brokerId = env.EVENT_BROKER.idFromName(subdomain);
  const broker = env.EVENT_BROKER.get(brokerId);

  const brokerResponse = await broker.fetch(
    new Request('https://broker/triggers/get', {
      method: 'POST',
      body: JSON.stringify({ trigger_slug: 'goal_achieved', limit: 200 }),
    }),
  );

  const { events } = (await brokerResponse.json()) as { events: TriggerEvent[] };

  // Apply cursor-based pagination (cursor = event ID to start after)
  let startIdx = 0;
  if (cursor) {
    const cursorIdx = events.findIndex((e) => e.id === cursor);
    if (cursorIdx !== -1) {
      startIdx = cursorIdx + 1;
    }
  }

  const page = events.slice(startIdx, startIdx + limit);

  const data = page.map((event) => ({
    goal_name: event.data.goal_name,
    target_amount: event.data.target_amount,
    achieved_at: event.data.achieved_at,
  }));

  // IFTTT test mode: return sample data when no real events exist
  if (testMode && data.length === 0) {
    const now = new Date();
    const sampleData = [
      { goal_name: 'Emergency Fund', target_amount: '10000', achieved_at: now.toISOString() },
      { goal_name: 'Vacation Fund', target_amount: '3000', achieved_at: new Date(now.getTime() - 86400000).toISOString() },
      { goal_name: 'New Car', target_amount: '25000', achieved_at: new Date(now.getTime() - 172800000).toISOString() },
    ];
    const sliced = sampleData.slice(0, limit);
    if (limit < sampleData.length) {
      return Response.json({ data: sliced, cursor: `sample-cursor-${limit}` });
    }
    return Response.json({ data: sliced });
  }

  // Include cursor for next page if there are more results
  const hasMore = startIdx + limit < events.length;
  if (hasMore && page.length > 0) {
    return Response.json({
      data,
      cursor: events[startIdx + limit - 1].id,
    });
  }

  return Response.json({ data });
}
