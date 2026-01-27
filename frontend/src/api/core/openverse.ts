/**
 * Openverse API Client
 *
 * Client for searching Creative Commons images via the Openverse API.
 * Handles credential management and authentication automatically.
 *
 * @see https://api.openverse.org/v1/
 */

import type { OpenverseImage, OpenverseSearchRequest, OpenverseSearchResult } from '../../types';
import { ensureCredentials, getValidToken } from '../../utils/openverseCredentials';

// Openverse API base URL
const OPENVERSE_API = 'https://api.openverse.org/v1';

/**
 * Stock photo sources only - these are dedicated stock photo sites
 * with professional, generic imagery (no personal photos or press photos).
 */
const STOCK_SOURCES = [
  'stocksnap', // StockSnap - free stock photos
  'rawpixel', // rawpixel - stock photos and vectors
].join(',');

/**
 * Transform raw Openverse API response to our typed format.
 */
function transformImage(raw: Record<string, unknown>): OpenverseImage {
  return {
    id: String(raw['id'] || ''),
    title: String(raw['title'] || ''),
    creator: raw['creator'] ? String(raw['creator']) : null,
    creatorUrl: raw['creator_url'] ? String(raw['creator_url']) : null,
    url: String(raw['url'] || ''),
    thumbnail: String(raw['thumbnail'] || raw['url'] || ''),
    license: String(raw['license'] || 'unknown'),
    licenseName: String(
      raw['license_version']
        ? `CC ${String(raw['license']).toUpperCase()} ${raw['license_version']}`
        : String(raw['license'] || 'Unknown')
    ),
    licenseUrl: String(raw['license_url'] || ''),
    source: String(raw['source'] || 'openverse'),
  };
}

/**
 * Search for images on Openverse.
 * Automatically handles credential registration and token management.
 */
export async function searchImages(
  request: OpenverseSearchRequest
): Promise<OpenverseSearchResult> {
  // Ensure we have credentials (registers if needed)
  await ensureCredentials();

  // Get a valid access token
  const token = await getValidToken();

  // Build search URL
  const params = new URLSearchParams({
    q: request.query,
    page: String(request.page || 1),
    page_size: String(request.pageSize || 20),
    // Filter to stock photo sources only (avoids personal/press photos)
    source: STOCK_SOURCES,
  });

  // Add license filter if specified
  if (request.license && request.license !== 'all') {
    if (request.license === 'commercial') {
      params.set('license_type', 'commercial');
    } else if (request.license === 'modification') {
      params.set('license_type', 'modification');
    }
  }

  const url = `${OPENVERSE_API}/images/?${params.toString()}`;

  // Make the search request
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add auth header if we have a token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Openverse search failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  // Transform the response
  const results = Array.isArray(data.results)
    ? data.results.map((item: Record<string, unknown>) => transformImage(item))
    : [];

  return {
    results,
    resultCount: typeof data.result_count === 'number' ? data.result_count : results.length,
    pageCount: typeof data.page_count === 'number' ? data.page_count : 1,
  };
}

/**
 * Generate attribution text for an Openverse image.
 * This is required by the Openverse terms of service.
 */
export function generateAttribution(image: OpenverseImage): string {
  const parts: string[] = [];

  if (image.title) {
    parts.push(`"${image.title}"`);
  }

  if (image.creator) {
    parts.push(`by ${image.creator}`);
  }

  parts.push(`via Openverse`);

  if (image.licenseName) {
    parts.push(`(${image.licenseName})`);
  }

  return parts.join(' ');
}
