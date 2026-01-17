/**
 * Rate Limit Banner
 *
 * Warning banner shown when rate limited by Monarch API or Eclosion's internal cooldown.
 * Displays countdown to next ping check and auto-dismisses when rate limit clears.
 *
 * Shows different messages based on source:
 * - Eclosion cooldown: Internal 5-minute sync cooldown to protect Monarch account
 * - Monarch rate limit: External API rate limit from Monarch
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { useRateLimit } from '../../context/RateLimitContext';
import { UI } from '../../constants';

export function RateLimitBanner() {
  const { isRateLimited, nextPingAt, triggerPing, source } = useRateLimit();
  const [timeUntilPing, setTimeUntilPing] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);

  // Determine if this is Eclosion's internal sync cooldown
  const isEclosionCooldown = source === 'eclosion_sync_cooldown';

  // Update countdown timer
  useEffect(() => {
    if (!nextPingAt || !isRateLimited) {
      setTimeUntilPing('');
      return;
    }

    const updateTime = () => {
      const now = Date.now();
      const diff = nextPingAt.getTime() - now;

      if (diff <= 0) {
        setTimeUntilPing('checking...');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (minutes > 0) {
        setTimeUntilPing(`${minutes}m ${seconds}s`);
      } else {
        setTimeUntilPing(`${seconds}s`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, UI.INTERVAL.COOLDOWN_TICK);
    return () => clearInterval(interval);
  }, [nextPingAt, isRateLimited]);

  const handleCheckNow = async () => {
    setIsChecking(true);
    try {
      await triggerPing();
    } finally {
      setIsChecking(false);
    }
  };

  // Hide banner while checking (per user request)
  if (!isRateLimited || isChecking) return null;

  // Different messages based on source
  const message = isEclosionCooldown
    ? 'Sync is on cooldown.'
    : 'Monarch sync paused due to too many requests.';

  const Icon = isEclosionCooldown ? Clock : AlertTriangle;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rate-limit-banner flex items-center justify-between gap-3 py-2 px-4 text-sm"
      style={{
        backgroundColor: 'var(--monarch-warning-bg)',
        borderTop: '1px solid var(--monarch-border)',
        color: 'var(--monarch-warning)',
        flexShrink: 0,
      }}
    >
      <div className="flex items-center gap-2">
        <Icon size={16} className="shrink-0" aria-hidden="true" />
        <span>
          {message}
          {timeUntilPing === 'checking...'
            ? ' Checking...'
            : timeUntilPing && ` Retrying in ${timeUntilPing}.`}
        </span>
      </div>
      <button
        type="button"
        onClick={handleCheckNow}
        disabled={isChecking}
        className="px-3 py-1 rounded text-xs font-medium transition-colors shrink-0 disabled:opacity-50"
        style={{
          backgroundColor: 'var(--monarch-warning)',
          color: 'white',
        }}
        aria-label="Check if rate limit has cleared"
      >
        Check Now
      </button>
    </div>
  );
}
