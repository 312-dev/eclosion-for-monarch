/**
 * Cloudflare Pages Function: /api/ideas
 *
 * Fetches community ideas from GitHub and caches them using Cloudflare's Cache API.
 * This provides faster responses and reduces load on GitHub.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Env {
  // Cloudflare environment bindings (if needed in the future)
}

const GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/graysoncadams/eclosion-for-monarch/main/data/ideas.json';
const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Use the GitHub URL as the cache key
  const cacheKey = new Request(GITHUB_RAW_URL);
  const cache = caches.default;

  // Check if we have a cached response
  let response = await cache.match(cacheKey);

  if (response) {
    // Return cached response with CORS headers
    const cachedHeaders = new Headers(response.headers);
    cachedHeaders.set('Access-Control-Allow-Origin', '*');
    cachedHeaders.set('X-Cache-Status', 'HIT');

    return new Response(response.body, {
      status: response.status,
      headers: cachedHeaders,
    });
  }

  // Fetch fresh data from GitHub
  try {
    const githubResponse = await fetch(GITHUB_RAW_URL, {
      headers: {
        'User-Agent': 'Eclosion-Ideas-Cache/1.0',
      },
    });

    if (!githubResponse.ok) {
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch ideas from source',
          status: githubResponse.status,
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const data = await githubResponse.json();

    // Create a cacheable response
    response = new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
        'Access-Control-Allow-Origin': '*',
        'X-Cache-Status': 'MISS',
      },
    });

    // Store in Cloudflare's edge cache (non-blocking)
    context.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch ideas',
        details: message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
