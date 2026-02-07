/**
 * Shared types for the IFTTT Service Worker.
 */

export interface Env {
  IFTTT_TOKENS: KVNamespace;
  TUNNELS: KVNamespace;
  EVENT_BROKER: DurableObjectNamespace;
  IFTTT_SERVICE_KEY: string;
  OAUTH_SIGNING_SECRET: string;
  OAUTH_CLIENT_ID: string;
  OAUTH_CLIENT_SECRET: string;
  DEMO_PASSWORD: string;
}

// --- Demo Mode ---

export const DEMO_SUBDOMAIN = 'demo';

export function isDemoSubdomain(subdomain: string): boolean {
  return subdomain === DEMO_SUBDOMAIN;
}

// --- OAuth2 ---

export interface AuthCodeData {
  subdomain: string;
  redirect_uri: string;
  created_at: string;
  code_challenge?: string; // PKCE: SHA256 hash of code_verifier
  code_challenge_method?: 'S256'; // Only S256 is supported
}

export interface TokenData {
  subdomain: string;
  created_at: string;
}

export interface IftttUserData {
  connected: boolean;
  connected_at: string;
}

// --- IFTTT API ---

export interface IftttActionRequest {
  actionFields: Record<string, string>;
  ifttt_source: {
    id: string;
    url: string;
  };
  user: {
    timezone: string;
  };
}

export interface IftttTriggerRequest {
  trigger_identity: string;
  triggerFields: Record<string, string>;
  limit: number;
  ifttt_source: {
    id: string;
    url: string;
  };
  user: {
    timezone: string;
  };
}

export interface IftttFieldOption {
  label: string;
  value: string;
}

// --- Event Broker ---

export interface QueuedAction {
  id: string;
  action_slug: string;
  fields: Record<string, string>;
  queued_at: number;
  ifttt_request_id: string;
}

export interface TriggerEvent {
  id: string;
  trigger_slug: string;
  timestamp: number;
  data: Record<string, string>;
}

export interface CachedFieldOptions {
  data: IftttFieldOption[];
  updated_at: number;
}

export interface ActionHistoryEntry {
  id: string;
  action_slug: string;
  fields: Record<string, string>;
  queued_at?: number; // When action was queued (only for was_queued=true)
  executed_at: number;
  success: boolean;
  error?: string;
  proxy_error?: string;
  was_queued: boolean;
}

// --- OTP Approval (OAuth confirmation flow) ---

export interface OtpApproval {
  subdomain: string;
  redirect_uri: string;
  state: string;
  created_at: number;
  code_challenge?: string; // PKCE: SHA256 hash of code_verifier
  code_challenge_method?: 'S256'; // Only S256 is supported
}

export interface ActionSecretData {
  secret: string;
  created_at: string;
}

// --- Tunnel Metadata (from TUNNELS KV) ---

export interface SubdomainData {
  tunnel_id: string;
  created_at: string;
  management_key_hash: string;
}

// --- Trigger Subscriptions (for efficient event pushing) ---

export interface TriggerSubscription {
  trigger_identity: string;
  trigger_slug: string;
  fields: Record<string, string>;
  subscribed_at: number;
}
