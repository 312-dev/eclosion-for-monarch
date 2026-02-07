/**
 * EventBroker Durable Object
 *
 * Per-user message broker that stores:
 * 1. Action Queue — IFTTT actions queued when tunnel is offline, auto-executed on reconnect
 * 2. Trigger Events — Events pushed by desktop for IFTTT to poll
 * 3. Cached Field Options — Category/goal lists for offline dropdown population
 *
 * Each subdomain gets its own Durable Object instance (keyed by subdomain).
 * Strong consistency within a single instance guarantees event ordering.
 */

import type { QueuedAction, TriggerEvent, CachedFieldOptions, IftttFieldOption, ActionHistoryEntry, TriggerSubscription } from '../types';

const MAX_QUEUED_ACTIONS = 100;
const MAX_TRIGGER_EVENTS = 200;
const MAX_ACTION_HISTORY = 50;
const ACTION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TRIGGER_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const HISTORY_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Rate limiting: max 15 actions per minute per subdomain
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_ACTIONS = 15;

export class EventBroker implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
    // Schedule periodic pruning
    this.state.storage.setAlarm(Date.now() + PRUNE_INTERVAL_MS);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Action Queue endpoints
      if (path === '/queue/push' && request.method === 'POST') {
        return this.handleQueuePush(request);
      }
      if (path === '/queue/pending' && request.method === 'GET') {
        return this.handleQueuePending();
      }
      if (path === '/queue/ack' && request.method === 'POST') {
        return this.handleQueueAck(request);
      }

      // Trigger Event endpoints
      if (path === '/triggers/push' && request.method === 'POST') {
        return this.handleTriggerPush(request);
      }
      if (path === '/triggers/get' && request.method === 'POST') {
        return this.handleTriggerGet(request);
      }

      // Field Options endpoints
      if (path === '/field-options/set' && request.method === 'POST') {
        return this.handleFieldOptionsSet(request);
      }
      if (path === '/field-options/get' && request.method === 'POST') {
        return this.handleFieldOptionsGet(request);
      }

      // Action History endpoints
      if (path === '/history/push' && request.method === 'POST') {
        return this.handleHistoryPush(request);
      }
      if (path === '/history/get' && request.method === 'GET') {
        return this.handleHistoryGet();
      }

      // Trigger History endpoint (all recent triggers across all slugs)
      if (path === '/triggers/history' && request.method === 'GET') {
        return this.handleTriggerHistory();
      }

      // Subscription endpoints (for efficient event pushing)
      if (path === '/subscriptions/set' && request.method === 'POST') {
        return this.handleSubscriptionSet(request);
      }
      if (path === '/subscriptions/list' && request.method === 'GET') {
        return this.handleSubscriptionList();
      }
      if (path === '/subscriptions/delete' && request.method === 'POST') {
        return this.handleSubscriptionDelete(request);
      }

      // Rate limiting endpoint
      if (path === '/rate-limit/check' && request.method === 'POST') {
        return this.handleRateLimitCheck();
      }

      return Response.json({ error: 'Not found' }, { status: 404 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error';
      return Response.json({ error: message }, { status: 500 });
    }
  }

  async alarm(): Promise<void> {
    await this.pruneExpired();
    // Reschedule
    this.state.storage.setAlarm(Date.now() + PRUNE_INTERVAL_MS);
  }

  // --- Action Queue ---

  private async handleQueuePush(request: Request): Promise<Response> {
    const action = (await request.json()) as QueuedAction;

    // Check deduplication by ifttt_request_id
    const existing = await this.state.storage.list<QueuedAction>({
      prefix: 'queue:',
    });

    for (const [, existing_action] of existing) {
      if (existing_action.ifttt_request_id === action.ifttt_request_id) {
        return Response.json({ id: existing_action.id, deduplicated: true });
      }
    }

    // Enforce max queue size
    if (existing.size >= MAX_QUEUED_ACTIONS) {
      // Remove oldest
      const sorted = [...existing.entries()].sort(
        (a, b) => a[1].queued_at - b[1].queued_at,
      );
      if (sorted.length > 0) {
        await this.state.storage.delete(sorted[0][0]);
      }
    }

    await this.state.storage.put(`queue:${action.id}`, action);
    return Response.json({ id: action.id, queued: true });
  }

  private async handleQueuePending(): Promise<Response> {
    const now = Date.now();
    const actions = await this.state.storage.list<QueuedAction>({
      prefix: 'queue:',
    });

    const pending: QueuedAction[] = [];
    const expired: string[] = [];

    for (const [key, action] of actions) {
      if (now - action.queued_at > ACTION_TTL_MS) {
        expired.push(key);
      } else {
        pending.push(action);
      }
    }

    // Clean up expired
    if (expired.length > 0) {
      await this.state.storage.delete(expired);
    }

    // Sort oldest first (FIFO execution)
    pending.sort((a, b) => a.queued_at - b.queued_at);

    return Response.json({ actions: pending });
  }

  private async handleQueueAck(request: Request): Promise<Response> {
    const { id } = (await request.json()) as { id: string };
    await this.state.storage.delete(`queue:${id}`);
    return Response.json({ acknowledged: true });
  }

  // --- Trigger Events ---

  private async handleTriggerPush(request: Request): Promise<Response> {
    const event = (await request.json()) as TriggerEvent;

    // Store with composite key for per-trigger-slug ordering
    await this.state.storage.put(
      `trigger:${event.trigger_slug}:${event.id}`,
      event,
    );

    // Enforce max events per trigger slug
    const events = await this.state.storage.list<TriggerEvent>({
      prefix: `trigger:${event.trigger_slug}:`,
    });

    if (events.size > MAX_TRIGGER_EVENTS) {
      const sorted = [...events.entries()].sort(
        (a, b) => a[1].timestamp - b[1].timestamp,
      );
      const toDelete = sorted.slice(0, sorted.length - MAX_TRIGGER_EVENTS);
      await this.state.storage.delete(toDelete.map(([key]) => key));
    }

    return Response.json({ id: event.id, stored: true });
  }

  private async handleTriggerGet(request: Request): Promise<Response> {
    const { trigger_slug, limit = 50 } = (await request.json()) as {
      trigger_slug: string;
      limit?: number;
    };

    const events = await this.state.storage.list<TriggerEvent>({
      prefix: `trigger:${trigger_slug}:`,
    });

    const now = Date.now();
    const results: TriggerEvent[] = [];
    const expired: string[] = [];

    for (const [key, event] of events) {
      if (now - event.timestamp * 1000 > TRIGGER_TTL_MS) {
        expired.push(key);
      } else {
        results.push(event);
      }
    }

    // Clean up expired
    if (expired.length > 0) {
      await this.state.storage.delete(expired);
    }

    // Sort descending by timestamp (IFTTT requirement)
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    const limited = results.slice(0, Math.min(limit, 50));

    return Response.json({ events: limited });
  }

  // --- Field Options Cache ---

  private async handleFieldOptionsSet(request: Request): Promise<Response> {
    const { field_slug, options } = (await request.json()) as {
      field_slug: string;
      options: IftttFieldOption[];
    };

    const cached: CachedFieldOptions = {
      data: options,
      updated_at: Date.now(),
    };

    await this.state.storage.put(`field-options:${field_slug}`, cached);
    return Response.json({ stored: true });
  }

  private async handleFieldOptionsGet(request: Request): Promise<Response> {
    const { field_slug } = (await request.json()) as { field_slug: string };

    const cached = await this.state.storage.get<CachedFieldOptions>(
      `field-options:${field_slug}`,
    );

    if (!cached) {
      return Response.json({ data: [] });
    }

    return Response.json({ data: cached.data });
  }

  // --- Action History ---

  private async handleHistoryPush(request: Request): Promise<Response> {
    const entry = (await request.json()) as ActionHistoryEntry;

    // Store with timestamp-based key for ordering
    await this.state.storage.put(`history:${entry.executed_at}:${entry.id}`, entry);

    // Enforce max history size
    const history = await this.state.storage.list<ActionHistoryEntry>({
      prefix: 'history:',
    });

    if (history.size > MAX_ACTION_HISTORY) {
      const sorted = [...history.entries()].sort(
        (a, b) => a[1].executed_at - b[1].executed_at,
      );
      const toDelete = sorted.slice(0, sorted.length - MAX_ACTION_HISTORY);
      await this.state.storage.delete(toDelete.map(([key]) => key));
    }

    return Response.json({ stored: true });
  }

  private async handleHistoryGet(): Promise<Response> {
    const now = Date.now();
    const history = await this.state.storage.list<ActionHistoryEntry>({
      prefix: 'history:',
    });

    const results: ActionHistoryEntry[] = [];
    const expired: string[] = [];

    for (const [key, entry] of history) {
      if (now - entry.executed_at > HISTORY_TTL_MS) {
        expired.push(key);
      } else {
        results.push(entry);
      }
    }

    // Clean up expired
    if (expired.length > 0) {
      await this.state.storage.delete(expired);
    }

    // Sort newest first
    results.sort((a, b) => b.executed_at - a.executed_at);

    return Response.json({ history: results });
  }

  // --- Trigger History (all slugs) ---

  private async handleTriggerHistory(): Promise<Response> {
    const now = Date.now();
    const triggers = await this.state.storage.list<TriggerEvent>({
      prefix: 'trigger:',
    });

    const results: TriggerEvent[] = [];
    const expired: string[] = [];

    for (const [key, event] of triggers) {
      if (now - event.timestamp * 1000 > TRIGGER_TTL_MS) {
        expired.push(key);
      } else {
        results.push(event);
      }
    }

    // Clean up expired
    if (expired.length > 0) {
      await this.state.storage.delete(expired);
    }

    // Sort newest first
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Return most recent 100 across all trigger types
    return Response.json({ triggers: results.slice(0, 100) });
  }

  // --- Trigger Subscriptions ---

  private async handleSubscriptionSet(request: Request): Promise<Response> {
    const sub = (await request.json()) as TriggerSubscription;

    // Store with composite key: sub:{trigger_slug}:{trigger_identity}
    const key = `sub:${sub.trigger_slug}:${sub.trigger_identity}`;
    await this.state.storage.put(key, sub);

    return Response.json({ stored: true });
  }

  private async handleSubscriptionList(): Promise<Response> {
    const subs = await this.state.storage.list<TriggerSubscription>({
      prefix: 'sub:',
    });

    const subscriptions: TriggerSubscription[] = [...subs.values()];

    return Response.json({ subscriptions });
  }

  private async handleSubscriptionDelete(request: Request): Promise<Response> {
    const { trigger_slug, trigger_identity } = (await request.json()) as {
      trigger_slug: string;
      trigger_identity: string;
    };

    const key = `sub:${trigger_slug}:${trigger_identity}`;
    await this.state.storage.delete(key);

    return Response.json({ deleted: true });
  }

  // --- Rate Limiting ---

  /**
   * Check if action rate limit is exceeded and record the action attempt.
   * Uses a sliding window of timestamps within the rate limit window.
   */
  private async handleRateLimitCheck(): Promise<Response> {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    // Get existing timestamps
    const timestamps = (await this.state.storage.get<number[]>('rate-limit:actions')) ?? [];

    // Filter to only timestamps within the window
    const recentTimestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if over limit
    if (recentTimestamps.length >= RATE_LIMIT_MAX_ACTIONS) {
      const oldestInWindow = Math.min(...recentTimestamps);
      const retryAfterMs = oldestInWindow + RATE_LIMIT_WINDOW_MS - now;
      return Response.json({
        allowed: false,
        current: recentTimestamps.length,
        limit: RATE_LIMIT_MAX_ACTIONS,
        retry_after_ms: Math.max(0, retryAfterMs),
      });
    }

    // Record this action and save
    recentTimestamps.push(now);
    await this.state.storage.put('rate-limit:actions', recentTimestamps);

    return Response.json({
      allowed: true,
      current: recentTimestamps.length,
      limit: RATE_LIMIT_MAX_ACTIONS,
    });
  }

  // --- Pruning ---

  private async pruneExpired(): Promise<void> {
    const now = Date.now();

    // Prune expired actions
    const actions = await this.state.storage.list<QueuedAction>({
      prefix: 'queue:',
    });
    const expiredActions: string[] = [];
    for (const [key, action] of actions) {
      if (now - action.queued_at > ACTION_TTL_MS) {
        expiredActions.push(key);
      }
    }
    if (expiredActions.length > 0) {
      await this.state.storage.delete(expiredActions);
    }

    // Prune expired trigger events
    const triggers = await this.state.storage.list<TriggerEvent>({
      prefix: 'trigger:',
    });
    const expiredTriggers: string[] = [];
    for (const [key, event] of triggers) {
      if (now - event.timestamp * 1000 > TRIGGER_TTL_MS) {
        expiredTriggers.push(key);
      }
    }
    if (expiredTriggers.length > 0) {
      await this.state.storage.delete(expiredTriggers);
    }

    // Prune expired action history
    const history = await this.state.storage.list<ActionHistoryEntry>({
      prefix: 'history:',
    });
    const expiredHistory: string[] = [];
    for (const [key, entry] of history) {
      if (now - entry.executed_at > HISTORY_TTL_MS) {
        expiredHistory.push(key);
      }
    }
    if (expiredHistory.length > 0) {
      await this.state.storage.delete(expiredHistory);
    }

    // Prune rate limit timestamps (keep only recent window)
    const timestamps = (await this.state.storage.get<number[]>('rate-limit:actions')) ?? [];
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const recentTimestamps = timestamps.filter((ts) => ts > windowStart);
    if (recentTimestamps.length !== timestamps.length) {
      await this.state.storage.put('rate-limit:actions', recentTimestamps);
    }
  }
}
