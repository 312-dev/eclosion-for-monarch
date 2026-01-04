/**
 * FeatureCard - Highlight a key feature with icon and description
 *
 * Usage in MDX:
 * ```mdx
 * import { FeatureCard, FeatureGrid } from '@site/src/components/FeatureCard';
 *
 * <FeatureGrid>
 *   <FeatureCard
 *     icon="📊"
 *     title="Track Subscriptions"
 *     description="Keep all your recurring charges in one place"
 *   />
 *   <FeatureCard
 *     icon="🎯"
 *     title="Smart Rollups"
 *     description="Combine small expenses into budget-friendly groups"
 *   />
 * </FeatureGrid>
 * ```
 */

import React from 'react';

interface FeatureCardProps {
  /** Emoji or icon character */
  icon: string;
  /** Feature title */
  title: string;
  /** Feature description */
  description: string;
}

export function FeatureCard({
  icon,
  title,
  description,
}: FeatureCardProps): JSX.Element {
  return (
    <div
      style={{
        padding: '1.25rem',
        borderRadius: '8px',
        border: '1px solid var(--ifm-color-emphasis-300)',
        backgroundColor: 'var(--ifm-background-surface-color)',
      }}
    >
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
      <h4
        style={{
          margin: '0 0 0.5rem 0',
          fontSize: '1rem',
          fontWeight: 600,
        }}
      >
        {title}
      </h4>
      <p
        style={{
          margin: 0,
          fontSize: '0.875rem',
          color: 'var(--ifm-color-emphasis-700)',
        }}
      >
        {description}
      </p>
    </div>
  );
}

interface FeatureGridProps {
  children: React.ReactNode;
}

export function FeatureGrid({ children }: FeatureGridProps): JSX.Element {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        margin: '1.5rem 0',
      }}
    >
      {children}
    </div>
  );
}

export default FeatureCard;
