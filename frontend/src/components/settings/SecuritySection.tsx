/**
 * Security Section
 *
 * Security and activity settings with the SecurityPanel component.
 */

import { Shield } from 'lucide-react';
import { SecurityPanel } from '../SecurityPanel';

export function SecuritySection() {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5" style={{ color: 'var(--monarch-text-muted)' }}>
        <Shield size={12} />
        Security & Activity
      </h2>
      <div
        className="rounded-xl overflow-hidden p-4"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}
      >
        <SecurityPanel />
      </div>
    </section>
  );
}
