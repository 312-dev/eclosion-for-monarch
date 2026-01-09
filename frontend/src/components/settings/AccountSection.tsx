/**
 * Account Section
 *
 * Account management settings including lock.
 */

import { Lock, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function AccountSection() {
  const { lock } = useAuth();

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5" style={{ color: 'var(--monarch-text-muted)' }}>
        <Lock size={12} />
        Account
      </h2>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}
      >
        <button
          type="button"
          className="w-full p-4 flex items-center gap-4 text-left hover-bg-transparent-to-hover"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={lock}
        >
          <div
            className="p-2.5 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--monarch-bg-page)' }}
          >
            <Lock size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Lock
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              Lock Eclosion and return to the unlock screen
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--monarch-text-muted)' }} />
        </button>
      </div>
    </section>
  );
}
