/**
 * FeatureCard - Card displaying a feature with icon and description
 */

import type { ReactNode } from 'react';

interface FeatureCardProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg"
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
          {title}
        </div>
        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          {description}
        </div>
      </div>
    </div>
  );
}
