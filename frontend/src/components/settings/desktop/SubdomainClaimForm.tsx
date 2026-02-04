/**
 * Subdomain Claim Form
 *
 * Input field with .eclosion.me suffix, auto-check availability, and claim button.
 * Used in RemoteAccessSection when no subdomain has been claimed yet.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const checkAvailability = useCallback(async (value: string) => {
    if (!globalThis.electron?.tunnel || value.length < 3) return;

    setAvailability('checking');
    setAvailabilityError(null);

    try {
      const result = await globalThis.electron.tunnel.check(value);
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
  }, []);

  const handleSubdomainChange = (value: string) => {
    const normalized = value.toLowerCase().replaceAll(/[^a-z0-9-]/g, '');
    setSubdomain(normalized);
    setAvailability('idle');
    setAvailabilityError(null);

    // Debounce auto-check
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (normalized.length >= 3) {
      debounceRef.current = setTimeout(() => {
        checkAvailability(normalized);
      }, 1500);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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

  const canClaim = availability === 'available' && !claiming;

  const renderClaimButtonContent = (): React.ReactNode => {
    if (claiming) {
      return (
        <>
          <Loader2 size={16} className="animate-spin" />
          Claiming...
        </>
      );
    }
    if (availability === 'checking') {
      return (
        <>
          <Loader2 size={16} className="animate-spin" />
          Checking...
        </>
      );
    }
    return (
      <>
        <Globe size={16} />
        Claim & Enable
      </>
    );
  };

  return (
    <div className="px-4 pb-4">
      <div
        className="text-xs font-medium uppercase tracking-wide mb-2"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        Choose your subdomain
      </div>

      {/* Subdomain input with suffix + claim button */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--monarch-border)' }}
        >
          <input
            type="text"
            value={subdomain}
            onChange={(e) => handleSubdomainChange(e.target.value)}
            placeholder="my-home"
            maxLength={32}
            className="w-32 sm:w-48 px-3 py-2 text-sm outline-none"
            style={{
              color: 'var(--monarch-text-dark)',
              backgroundColor: 'var(--monarch-bg-page)',
            }}
            aria-label="Subdomain name"
            disabled={claiming}
          />
          <span
            className="inline-flex items-center px-3 py-2 text-sm"
            style={{
              color: 'var(--monarch-text-muted)',
              backgroundColor: 'var(--monarch-bg-card)',
              borderLeft: '1px solid var(--monarch-border)',
            }}
          >
            .eclosion.me
          </span>
        </div>

        <button
          onClick={handleClaim}
          disabled={!canClaim}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
          style={{
            backgroundColor: canClaim ? 'var(--monarch-orange)' : 'var(--monarch-bg-page)',
            color: canClaim ? 'white' : 'var(--monarch-text-muted)',
            border: canClaim ? 'none' : '1px solid var(--monarch-border)',
          }}
          type="button"
        >
          {renderClaimButtonContent()}
        </button>
      </div>

      {/* Availability indicator */}
      {(availability === 'available' ||
        availability === 'unavailable' ||
        availability === 'error') && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          {availability === 'available' && (
            <>
              <Check size={16} className="shrink-0" style={{ color: 'var(--monarch-green)' }} />
              <span style={{ color: 'var(--monarch-green)' }}>
                {subdomain}.eclosion.me is available
              </span>
            </>
          )}
          {availability === 'unavailable' && (
            <>
              <X size={16} className="shrink-0" style={{ color: 'var(--monarch-red)' }} />
              <span style={{ color: 'var(--monarch-red)' }}>
                {subdomain}.eclosion.me is already taken
              </span>
            </>
          )}
          {availability === 'error' && (
            <>
              <X size={16} className="shrink-0" style={{ color: 'var(--monarch-red)' }} />
              <span style={{ color: 'var(--monarch-red)' }}>
                {availabilityError ?? 'Error checking availability'}
              </span>
            </>
          )}
        </div>
      )}

      <p className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)', opacity: 0.7 }}>
        Can be released later if you want to change it.
      </p>
    </div>
  );
}
