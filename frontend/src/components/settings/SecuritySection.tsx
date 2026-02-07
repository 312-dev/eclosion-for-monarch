/**
 * Security Section
 *
 * Security and activity settings with the SecurityPanel component.
 */

import { SecurityPanel } from '../SecurityPanel';
import { SectionHeader } from './settingsSections';

export function SecuritySection() {
  return (
    <section className="mb-8">
      <SectionHeader sectionId="security" />
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
