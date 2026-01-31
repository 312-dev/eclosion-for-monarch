/**
 * Tunnel Status Hook
 *
 * Provides shared access to the current tunnel status for remote access.
 * Polls the tunnel status periodically to keep the UI up to date.
 */

import { useState, useEffect, useCallback } from 'react';
import type { TunnelStatus } from '../types/electron';

const POLL_INTERVAL = 5000; // 5 seconds

export interface UseTunnelStatusReturn {
  status: TunnelStatus | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useTunnelStatus(): UseTunnelStatusReturn {
  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!globalThis.electron?.tunnel) {
      setLoading(false);
      return;
    }
    try {
      const tunnelStatus = await globalThis.electron.tunnel.getStatus();
      setStatus(tunnelStatus);
    } catch {
      // Non-critical - keep previous status
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Poll for status updates
    const interval = setInterval(fetchStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { status, loading, refetch: fetchStatus };
}
