/**
 * IFTTT Test Setup Endpoint
 *
 * GET /ifttt/v1/test/setup
 *
 * Returns sample data for IFTTT's automated endpoint tests.
 * Authenticated via IFTTT-Service-Key header.
 *
 * Generates a test access token on the fly for a dedicated test subdomain,
 * storing it in KV so the token passes verification in resolveSubdomain().
 */

import { generateAccessToken } from '../auth/tokens';
import type { Env } from '../types';

const TEST_SUBDOMAIN = 'ifttt-test';

export async function handleTestSetup(request: Request, env: Env): Promise<Response> {
  const serviceKey = request.headers.get('IFTTT-Service-Key');

  if (!serviceKey || serviceKey !== env.IFTTT_SERVICE_KEY) {
    return Response.json(
      { errors: [{ message: 'Invalid service key' }] },
      { status: 401 },
    );
  }

  // Generate a fresh test token (stored in KV automatically)
  const accessToken = await generateAccessToken(TEST_SUBDOMAIN, env);

  return Response.json({
    data: {
      accessToken,
      samples: {
        triggers: {
          goal_achieved: {
            goal_name: 'Emergency Fund',
          },
          under_budget: {
            category: 'test-category-groceries',
            threshold_percent: '10',
          },
          budget_surplus: {
            minimum_amount: '50',
          },
          category_balance_threshold: {
            category: 'test-category-groceries',
            threshold_amount: '200',
            direction: 'above',
          },
          under_budget_streak: {
            category: 'test-category-groceries',
            streak_months: '3',
          },
          new_charge: {
            category: 'test-category-groceries',
            include_pending: 'include_pending',
          },
        },
        actions: {
          budget_to: {
            category: 'test-category-id',
            amount: '50',
          },
          budget_to_goal: {
            goal: 'test-goal-id',
            amount: '100',
          },
          move_funds: {
            source_category: 'test-category-groceries',
            destination_category: 'test-category-rent',
            amount: '25',
          },
        },
        queries: {
          list_achieved_goals: {},
          list_category_budgets: {},
          list_under_budget_categories: {},
          budget_summary: {},
        },
        triggerFieldValidations: {
          under_budget: {
            threshold_percent: {
              valid: '10',
              invalid: 'abc',
            },
          },
          budget_surplus: {
            minimum_amount: {
              valid: '50',
              invalid: '-10',
            },
          },
          category_balance_threshold: {
            threshold_amount: {
              valid: '200',
              invalid: 'notanumber',
            },
          },
          under_budget_streak: {
            streak_months: {
              valid: '3',
              invalid: '0',
            },
          },
        },
      },
    },
  });
}
