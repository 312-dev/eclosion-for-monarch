/**
 * Openverse Image Search Types
 *
 * Types for integrating with the Openverse API (Creative Commons image search).
 * Used for selecting goal images in the Stash feature.
 *
 * @see https://api.openverse.org/v1/
 */

/**
 * OAuth2 credentials for the Openverse API.
 * Auto-generated on first use and stored locally.
 */
export interface OpenverseCredentials {
  /** OAuth2 client ID */
  clientId: string;
  /** OAuth2 client secret */
  clientSecret: string;
  /** When credentials were registered (ISO timestamp) */
  registeredAt: string;
}

/**
 * OAuth2 access token for authenticated API requests.
 * Tokens expire after 12 hours.
 */
export interface OpenverseAccessToken {
  /** Bearer token for API requests */
  accessToken: string;
  /** When token expires (ISO timestamp) */
  expiresAt: string;
}

/**
 * An image result from Openverse search.
 */
export interface OpenverseImage {
  /** Unique Openverse image ID */
  id: string;
  /** Image title (may be empty) */
  title: string;
  /** Creator/photographer name */
  creator: string | null;
  /** URL to creator's profile */
  creatorUrl: string | null;
  /** Full-size image URL */
  url: string;
  /** Thumbnail URL (smaller, faster to load) */
  thumbnail: string;
  /** License identifier (e.g., "cc0", "by", "by-sa") */
  license: string;
  /** Human-readable license name */
  licenseName: string;
  /** URL to license details */
  licenseUrl: string;
  /** Source provider (e.g., "flickr", "wikimedia") */
  source: string;
}

/**
 * Search parameters for Openverse image search.
 */
export interface OpenverseSearchRequest {
  /** Search query text */
  query: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Results per page (default 20, max 500) */
  pageSize?: number;
  /** Filter by license type */
  license?: OpenverseLicenseFilter;
}

/**
 * License filter options for Openverse search.
 */
export type OpenverseLicenseFilter =
  | 'all' // All licenses
  | 'commercial' // Allows commercial use
  | 'modification'; // Allows modification

/**
 * Response from Openverse image search.
 */
export interface OpenverseSearchResult {
  /** Array of matching images */
  results: OpenverseImage[];
  /** Total number of results */
  resultCount: number;
  /** Total number of pages */
  pageCount: number;
}

/**
 * Registration request sent to Openverse API.
 */
export interface OpenverseRegisterRequest {
  /** Application name (must be unique across all Openverse clients) */
  name: string;
  /** Application description */
  description: string;
  /** Contact email */
  email: string;
}

/**
 * Registration response from Openverse API.
 */
export interface OpenverseRegisterResponse {
  /** Generated client ID */
  client_id: string;
  /** Generated client secret */
  client_secret: string;
  /** Application name */
  name: string;
}

/**
 * Token request sent to Openverse API.
 */
export interface OpenverseTokenRequest {
  /** OAuth2 client ID */
  client_id: string;
  /** OAuth2 client secret */
  client_secret: string;
  /** Grant type (always "client_credentials") */
  grant_type: 'client_credentials';
}

/**
 * Token response from Openverse API.
 */
export interface OpenverseTokenResponse {
  /** Bearer access token */
  access_token: string;
  /** Token type (always "Bearer") */
  token_type: 'Bearer';
  /** Token lifetime in seconds (43200 = 12 hours) */
  expires_in: number;
  /** OAuth2 scope */
  scope: string;
}

/**
 * Image selection result passed back from ImageSearchModal.
 */
export interface ImageSelection {
  /** Image URL to store */
  url: string;
  /** Thumbnail URL for display */
  thumbnail: string;
  /** Attribution text (required by Openverse) */
  attribution: string;
  /** Source type */
  source: 'openverse' | 'local';
}
