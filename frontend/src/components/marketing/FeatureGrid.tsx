/**
 * Feature Grid Component
 *
 * Responsive grid of feature cards.
 * Optionally shows coming-soon features in a separate section.
 */

import { FeatureCard } from './FeatureCard';
import { getAvailableFeatures, getComingSoonFeatures } from '../../data/features';
import type { FeatureDefinition } from '../../data/features';

interface FeatureGridProps {
  /** Features to display. If not provided, uses all features. */
  features?: FeatureDefinition[];
  /** Show coming-soon features in a separate section */
  showComingSoon?: boolean;
  /** Card variant */
  variant?: 'compact' | 'detailed';
}

export function FeatureGrid({
  features,
  showComingSoon = false,
  variant = 'compact',
}: FeatureGridProps) {
  const availableFeatures = features
    ? features.filter((f) => f.status === 'available')
    : getAvailableFeatures();

  const comingSoonFeatures = showComingSoon
    ? features
      ? features.filter((f) => f.status === 'coming-soon')
      : getComingSoonFeatures()
    : [];

  return (
    <div className="space-y-12">
      {/* Available Features */}
      {availableFeatures.length > 0 && (
        <div>
          <div
            className={`grid gap-6 ${
              variant === 'detailed'
                ? 'grid-cols-1 lg:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {availableFeatures.map((feature) => (
              <FeatureCard key={feature.id} feature={feature} variant={variant} />
            ))}
          </div>
        </div>
      )}

      {/* Coming Soon Features */}
      {comingSoonFeatures.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-lg font-semibold text-[var(--monarch-text-dark)]">
              Coming Soon
            </h3>
            <div className="flex-1 h-px bg-[var(--monarch-border)]" />
          </div>
          <div
            className={`grid gap-6 ${
              variant === 'detailed'
                ? 'grid-cols-1 lg:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {comingSoonFeatures.map((feature) => (
              <FeatureCard key={feature.id} feature={feature} variant={variant} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {availableFeatures.length === 0 && comingSoonFeatures.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[var(--monarch-text-muted)]">
            No features available yet. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
