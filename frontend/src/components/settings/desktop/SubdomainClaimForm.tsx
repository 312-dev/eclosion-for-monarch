/**
 * Subdomain Claim Form
 *
 * Input field with .eclosion.me suffix, availability check, and claim button.
 * Used in RemoteAccessSection when no subdomain has been claimed yet.
 */

import { useState, useCallback } from 'react';
import { Check, X, Loader2, Globe } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';

interface SubdomainClaimFormProps {
  onClaimed: () => void;
}

type AvailabilityState = 'idle' | 'checking' | 'available' | 'unavailable' | 'error';

export function SubdomainClaimForm({ onClaimed }: SubdomainClaimFormProps) {
  const [subdomain, setSubdomain] = useState('');
  const [availability, setAvailability] = useState<AvailabilityState>('idle');
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const toast = useToast();

  const handleSubdomainChange = (value: string) => {
    // Normalize: lowercase, strip invalid characters
    const normalized = value.toLowerCase().replaceAll(/[^a-z0-9-]/g, '');
    setSubdomain(normalized);
    // Reset availability when input changes
    setAvailability('idle');
    setAvailabilityError(null);
  };

  const checkAvailability = useCallback(async () => {
    if (!globalThis.electron?.tunnel || subdomain.length < 3) return;

    setAvailability('checking');
    setAvailabilityError(null);

    try {
      const result = await globalThis.electron.tunnel.check(subdomain);
      if (result.error) {
        setAvailability('error');
        setAvailabilityError(result.error);
      } else {
        setAvailability(result.available ? 'available' : 'unavailable');
      }
    } catch {
      setAvailability('error');
      setAvailabilityError('Failed to check availability');
    }
  }, [subdomain]);

  const handleClaim = async () => {
    if (!globalThis.electron?.tunnel || availability !== 'available') return;

    setClaiming(true);
    try {
      const result = await globalThis.electron.tunnel.claim(subdomain);
      if (result.success) {
        toast.success(`Remote access enabled at ${result.subdomain}.eclosion.me`);
        onClaimed();
      } else {
        toast.error(result.error ?? 'Failed to claim subdomain');
      }
    } catch {
      toast.error('Failed to claim subdomain');
    } finally {
      setClaiming(false);
    }
  };

  const isValidLength = subdomain.length >= 3;
  const canCheck = isValidLength && availability === 'idle';
  const canClaim = availability === 'available' && !claiming;

  return (
    <div className="px-4 pb-4">
      <p className="text-sm mb-3" style={{ color: 'var(--monarch-text-muted)' }}>
        Choose a permanent subdomain for remote access. This creates a stable URL
        you can bookmark on your phone.
      </p>

      {/* Subdomain input with suffix */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex items-center flex-1 rounded-lg overflow-hidden"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <input
            type="text"
            value={subdomain}
            onChange={(e) => handleSubdomainChange(e.target.value)}
            placeholder="my-home"
            maxLength={32}
            className="flex-1 px-3 py-2 text-sm bg-transparent outline-none min-w-0"
            style={{ color: 'var(--monarch-text-dark)' }}
            aria-label="Subdomain name"
            disabled={claiming}
          />
          <span
            className="px-3 py-2 text-sm shrink-0"
            style={{
              color: 'var(--monarch-text-muted)',
              backgroundColor: 'var(--monarch-bg-card)',
              borderLeft: '1px solid var(--monarch-border)',
            }}
          >
            .eclosion.me
          </span>
        </div>

        {/* Check availability button */}
        <button
          onClick={checkAvailability}
          disabled={!canCheck || claiming}
          className="px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 disabled:opacity-50"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
            color: 'var(--monarch-text-dark)',
          }}
          type="button"
          aria-label="Check availability"
        >
          {availability === 'checking' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            'Check'
          )}
        </button>
      </div>

      {/* Availability indicator */}
      {availability !== 'idle' && availability !== 'checking' && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          {availability === 'available' && (
            <>
              <Check size={16} style={{ color: 'var(--monarch-green)' }} />
              <span style={{ color: 'var(--monarch-green)' }}>
                {subdomain}.eclosion.me is available
              </span>
            </>
          )}
          {availability === 'unavailable' && (
            <>
              <X size={16} style={{ color: 'var(--monarch-red)' }} />
              <span style={{ color: 'var(--monarch-red)' }}>
                {subdomain}.eclosion.me is already taken
              </span>
            </>
          )}
          {availability === 'error' && (
            <>
              <X size={16} style={{ color: 'var(--monarch-red)' }} />
              <span style={{ color: 'var(--monarch-red)' }}>
                {availabilityError ?? 'Error checking availability'}
              </span>
            </>
          )}
        </div>
      )}

      {/* Claim button */}
      <button
        onClick={handleClaim}
        disabled={!canClaim}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 w-full justify-center"
        style={{
          backgroundColor: canClaim ? 'var(--monarch-orange)' : 'var(--monarch-bg-page)',
          color: canClaim ? 'white' : 'var(--monarch-text-muted)',
          border: canClaim ? 'none' : '1px solid var(--monarch-border)',
        }}
        type="button"
      >
        {claiming ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Claiming...
          </>
        ) : (
          <>
            <Globe size={16} />
            Claim & Enable Remote Access
          </>
        )}
      </button>

      <p className="text-xs mt-2" style={{ color: 'var(--monarch-text-muted)' }}>
        Your subdomain can be released later from the settings if you want to change it.
      </p>
    </div>
  );
}
