/**
 * IFTTT Realtime API Helper
 *
 * Sends notifications to IFTTT's Realtime API to trigger immediate polling
 * instead of waiting for the default ~1 hour interval.
 *
 * POST https://realtime.ifttt.com/v1/notifications
 */

import type { Env } from '../types';

const REALTIME_URL = 'https://realtime.ifttt.com/v1/notifications';

/**
 * Notify IFTTT to immediately poll triggers for a specific user.
 * Uses the user's subdomain as the user_id.
 */
export async function notifyRealtime(
  subdomain: string,
  env: Env,
): Promise<void> {
  try {
    await fetch(REALTIME_URL, {
      method: 'POST',
      headers: {
        'IFTTT-Service-Key': env.IFTTT_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Request-ID': crypto.randomUUID(),
      },
      body: JSON.stringify({
        data: [{ user_id: subdomain }],
      }),
    });
  } catch {
    // Realtime notification is best-effort — don't fail the request
  }
}
