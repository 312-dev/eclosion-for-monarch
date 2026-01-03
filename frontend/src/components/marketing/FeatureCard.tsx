/**
 * Feature Card Component
 *
 * Displays a single feature in the feature grid.
 * Shows icon, name, tagline, status badge, and CTA buttons.
 */

import { Link } from 'react-router-dom';
import { Icons, ChevronRightIcon } from '../icons';
import type { FeatureDefinition } from '../../data/features';

interface FeatureCardProps {
  feature: FeatureDefinition;
  /** Compact: grid card, Detailed: larger with more info */
  variant?: 'compact' | 'detailed';
}

function StatusBadge({ status }: { status: FeatureDefinition['status'] }) {
  const styles = {
    available: 'bg-[var(--monarch-success-bg)] text-[var(--monarch-success)]',
    'coming-soon': 'bg-[var(--monarch-warning-bg)] text-[var(--monarch-warning)]',
    beta: 'bg-[var(--monarch-info-bg)] text-[var(--monarch-info)]',
  };

  const labels = {
    available: 'Available',
    'coming-soon': 'Coming Soon',
    beta: 'Beta',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function FeatureCard({ feature, variant = 'compact' }: FeatureCardProps) {
  const IconComponent = Icons[feature.icon];
  const isAvailable = feature.status === 'available';

  if (variant === 'detailed') {
    return (
      <div className="flex flex-col p-6 rounded-xl bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)] hover:border-[var(--monarch-orange)] hover:shadow-lg transition-all duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--monarch-orange)] bg-opacity-10">
            <IconComponent size={24} color="var(--monarch-orange)" />
          </div>
          <StatusBadge status={feature.status} />
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold text-[var(--monarch-text-dark)] mb-2">
          {feature.name}
        </h3>
        <p className="text-sm text-[var(--monarch-text)] mb-4 flex-1">
          {feature.description}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {isAvailable && feature.demoPath && (
            <Link
              to={feature.demoPath}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--monarch-orange)] text-white hover:opacity-90 transition-opacity"
            >
              Try Demo
              <ChevronRightIcon size={16} color="white" />
            </Link>
          )}
          <Link
            to={`/features/${feature.id}`}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--monarch-border)] text-[var(--monarch-text-dark)] hover:bg-[var(--monarch-bg-hover)] transition-colors"
          >
            Learn More
          </Link>
        </div>
      </div>
    );
  }

  // Compact variant (default)
  return (
    <Link
      to={`/features/${feature.id}`}
      className="group flex flex-col items-center p-6 rounded-xl bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)] hover:border-[var(--monarch-orange)] hover:shadow-md transition-all duration-200"
    >
      {/* Icon */}
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--monarch-orange)] bg-opacity-10 text-[var(--monarch-orange)] mb-4 group-hover:scale-110 transition-transform">
        <IconComponent size={28} />
      </div>

      {/* Status */}
      <div className="mb-2">
        <StatusBadge status={feature.status} />
      </div>

      {/* Name */}
      <h3 className="text-lg font-semibold text-[var(--monarch-text-dark)] text-center mb-2">
        {feature.name}
      </h3>

      {/* Tagline */}
      <p className="text-sm text-[var(--monarch-text)] text-center">
        {feature.tagline}
      </p>
    </Link>
  );
}
