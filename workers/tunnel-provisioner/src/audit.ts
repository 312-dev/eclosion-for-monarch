/**
 * Audit Logging for Management Key Operations
 *
 * Logs security-relevant operations to KV for monitoring and incident response.
 * Audit entries are stored with a 90-day TTL.
 *
 * Operations logged:
 * - claim: Subdomain claimed
 * - unclaim: Subdomain released
 * - otp_register: OTP email registered
 * - otp_deregister: OTP email removed
 */

export type AuditOperation = 'claim' | 'unclaim' | 'otp_register' | 'otp_deregister';

export interface AuditEntry {
  operation: AuditOperation;
  subdomain: string;
  client_ip: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

const AUDIT_TTL = 90 * 24 * 60 * 60; // 90 days

/**
 * Log an audit entry for a management key operation.
 * Non-blocking - errors are swallowed to avoid breaking the main operation.
 */
export async function logAudit(
  kv: KVNamespace,
  operation: AuditOperation,
  subdomain: string,
  clientIp: string,
  success: boolean,
  error?: string,
): Promise<void> {
  try {
    const entry: AuditEntry = {
      operation,
      subdomain,
      client_ip: clientIp,
      timestamp: new Date().toISOString(),
      success,
      error,
    };

    // Key format: audit:{subdomain}:{timestamp}:{operation}
    // This allows listing by subdomain prefix
    const key = `audit:${subdomain}:${entry.timestamp}:${operation}`;

    await kv.put(key, JSON.stringify(entry), { expirationTtl: AUDIT_TTL });
  } catch {
    // Silently fail - audit logging should never break the main operation
  }
}

/**
 * Extract client IP from Cloudflare headers.
 */
export function getClientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown';
}
