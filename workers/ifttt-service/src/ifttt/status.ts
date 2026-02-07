/**
 * IFTTT Status Endpoint
 *
 * GET /ifttt/v1/status
 * Non-authenticated health check. IFTTT polls this to verify service availability.
 * Validates the IFTTT-Service-Key header.
 */

import type { Env } from '../types';

export function handleStatus(request: Request, env: Env): Response {
  const serviceKey = request.headers.get('IFTTT-Service-Key');

  if (!serviceKey || serviceKey !== env.IFTTT_SERVICE_KEY) {
    return Response.json(
      { errors: [{ message: 'Invalid service key' }] },
      { status: 401 },
    );
  }

  return new Response(null, { status: 200 });
}
