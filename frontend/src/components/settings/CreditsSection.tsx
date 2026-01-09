/**
 * Credits Section
 *
 * Displays contributor attribution for Eclosion features as simple bullet points.
 */

import { Heart, Package } from 'lucide-react';
import {
  useAllContributors,
  useUniqueContributors,
  type FeatureContributors,
} from '../../hooks/useContributors';
import { FEATURES, type FeatureDefinition } from '../../data/features';

interface OpenSourceProject {
  name: string;
  description: string;
  url: string;
  note?: string;
}

const OPEN_SOURCE_PROJECTS: OpenSourceProject[] = [
  {
    name: 'monarchmoney',
    description: 'Python library for the Monarch Money API',
    url: 'https://github.com/312-dev/monarchmoney',
    note: 'using our own fork',
  },
];

interface FeatureWithCredits extends FeatureDefinition {
  credits: FeatureContributors;
}

export function CreditsSection() {
  const allContributors = useAllContributors();
  const uniqueContributors = useUniqueContributors();

  // Get features that have contributor data
  const featuresWithCredits: FeatureWithCredits[] = FEATURES.reduce<FeatureWithCredits[]>(
    (acc, f) => {
      const credits = allContributors.features[f.id];
      if (credits) {
        acc.push({ ...f, credits });
      }
      return acc;
    },
    []
  );

  // Don't render if no contributor data
  if (uniqueContributors.length === 0) {
    return null;
  }

  return (
    <section className="my-8">
      <h2
        className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        <Heart size={12} />
        Credits
      </h2>
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Contributors */}
        <h3
          className="text-xs font-medium uppercase tracking-wide mb-2"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Contributors
        </h3>
        <ul className="space-y-1.5 text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
          {featuresWithCredits.map((feature) => {
            const parts: string[] = [];
            if (feature.credits.ideator) {
              parts.push(`ideated by @${feature.credits.ideator.username}`);
            }
            if (feature.credits.contributors.length > 0) {
              const devs = feature.credits.contributors.map(c => `@${c.username}`).join(', ');
              parts.push(`built by ${devs}`);
            }
            return (
              <li key={feature.id}>
                <span style={{ color: 'var(--monarch-text-dark)' }}>{feature.name}</span>
                {parts.length > 0 && ` — ${parts.join(', ')}`}
              </li>
            );
          })}
        </ul>

        {/* Open Source */}
        <h3
          className="text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          <Package size={10} />
          Open Source
        </h3>
        <ul className="space-y-1.5 text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          {OPEN_SOURCE_PROJECTS.map((project) => (
            <li key={project.name}>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                {project.name}
              </a>
              {' — '}
              {project.description}
              {project.note && (
                <span style={{ color: 'var(--monarch-text-muted)' }}> ({project.note})</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
