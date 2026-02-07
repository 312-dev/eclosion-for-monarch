/**
 * Remote Access Indicator
 *
 * Shows the status of remote access tunnel in the header.
 * - Green with pulsing animation when active
 * - Red when enabled but not active (failing)
 * - Muted when disabled
 * - Clicks navigate to settings remote access section
 *
 * Displays the subdomain URL instead of a random URL for named tunnels.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RadioIcon } from './icons/RadioIcon';
import { Tooltip } from './ui/Tooltip';
import type { TunnelStatus } from '../types/electron';

export function RemoteAccessIndicator() {
  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      if (!globalThis.electron?.tunnel) return;
      try {
        const tunnelStatus = await globalThis.electron.tunnel.getStatus();
        if (!cancelled) {
          setStatus(tunnelStatus);
        }
      } catch {
        // Non-critical
      }
    };

    // Initial check
    void checkStatus();

    // Subscribe to status change events for live updates
    const unsubscribe = globalThis.electron?.tunnel?.onStatusChanged?.((newStatus) => {
      if (!cancelled) {
        setStatus(newStatus);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // Don't render if not in desktop mode or no tunnel API
  if (!globalThis.electron?.tunnel) return null;

  const isActive = status?.active ?? false;
  const isEnabled = status?.enabled ?? false;
  const isFailing = isEnabled && !isActive;
  const subdomain = status?.subdomain;

  // Determine color based on state
  let color: string;
  let tooltipText: string;
  if (isActive && subdomain) {
    color = 'var(--monarch-green)';
    tooltipText = `Remote access: ${subdomain}.eclosion.me`;
  } else if (isActive) {
    color = 'var(--monarch-green)';
    tooltipText = 'Remote access: On';
  } else if (isFailing) {
    color = 'var(--monarch-red)';
    tooltipText = 'Remote access: Connection failed';
  } else {
    color = 'var(--monarch-text-muted)';
    tooltipText = 'Remote access: Off';
  }

  const handleClick = () => {
    navigate('/settings#remote-access');
  };

  return (
    <Tooltip content={tooltipText}>
      <button
        onClick={handleClick}
        className="flex items-center justify-center p-1.5 rounded-lg transition-colors hover:bg-(--monarch-bg-hover)"
        aria-label={tooltipText}
        type="button"
      >
        <RadioIcon size={20} color={color} autoAnimate={isActive} animationInterval={3000} />
      </button>
    </Tooltip>
  );
}
