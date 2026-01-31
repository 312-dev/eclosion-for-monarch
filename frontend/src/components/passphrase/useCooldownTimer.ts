import { useState, useMemo, useEffect, useCallback } from 'react';
import { UI } from '../../constants';
import { getCooldownSeconds, setLockoutState } from './PassphraseUtils';

interface UseCooldownTimerResult {
  cooldownRemaining: number;
  isInCooldown: boolean;
  startCooldown: (attempts: number) => void;
  cooldownUntil: number | null;
  setCooldownUntil: (value: number | null) => void;
}

/**
 * Hook to manage cooldown timer for failed passphrase attempts.
 * Handles the countdown display and state management.
 */
export function useCooldownTimer(
  initialCooldownUntil: number | null = null
): UseCooldownTimerResult {
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(initialCooldownUntil);
  const [tick, setTick] = useState(0);

  // Tick the countdown timer when in cooldown
  useEffect(() => {
    if (!cooldownUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      if (remaining <= 0) {
        setCooldownUntil(null);
      } else {
        setTick((t) => t + 1);
      }
    }, UI.INTERVAL.COOLDOWN_TICK);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  // Calculate cooldownRemaining from cooldownUntil (re-evaluated on tick)
  const cooldownRemaining = useMemo(
    () => (cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cooldownUntil, tick] // tick intentionally included to trigger recalculation each second
  );

  const isInCooldown = cooldownRemaining > 0;

  const startCooldown = useCallback((attempts: number) => {
    const seconds = getCooldownSeconds(attempts);
    const newCooldownUntil = seconds > 0 ? Date.now() + seconds * 1000 : null;
    if (newCooldownUntil) setCooldownUntil(newCooldownUntil);
    setLockoutState({ failedAttempts: attempts, cooldownUntil: newCooldownUntil });
  }, []);

  return {
    cooldownRemaining,
    isInCooldown,
    startCooldown,
    cooldownUntil,
    setCooldownUntil,
  };
}
