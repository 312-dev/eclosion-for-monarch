/**
 * Credits Section
 *
 * Displays contributor attribution for Eclosion features as simple bullet points.
 */

import { Heart } from 'lucide-react';
import {
  useAllContributors,
  useUniqueContributors,
  type FeatureContributors,
} from '../../hooks/useContributors';
import { FEATURES, type FeatureDefinition } from '../../data/features';

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
    <section className="mb-8">
      <h2
        className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        <Heart size={12} />
        Credits
      </h2>
      <div className="px-1">
        <p
          className="text-sm mb-3"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Eclosion is built by the community. Thank you to everyone who has
          contributed ideas and code.
        </p>
        <ul className="space-y-1.5 text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
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
      </div>
    </section>
  );
}
