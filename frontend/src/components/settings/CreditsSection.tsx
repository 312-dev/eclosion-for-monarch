/**
 * Credits Section
 *
 * Displays contributor attribution for Eclosion features.
 * Shows ideators and contributors from the community.
 */

import { Heart } from 'lucide-react';
import { ContributorAvatar } from '../ui/ContributorAvatar';
import {
  useUniqueContributors,
  useAllContributors,
  type FeatureContributors,
} from '../../hooks/useContributors';
import { LightbulbIcon, UsersIcon } from '../icons';
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
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div className="p-4">
          {/* Summary */}
          <p
            className="text-sm mb-4"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            Eclosion is built by the community. Thank you to everyone who has
            contributed ideas and code.
          </p>

          {/* Feature-by-feature credits */}
          <div className="space-y-4">
            {featuresWithCredits.map((feature) => (
              <div
                key={feature.id}
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--monarch-bg-page)' }}
              >
                <h3
                  className="text-sm font-medium mb-2"
                  style={{ color: 'var(--monarch-text-dark)' }}
                >
                  {feature.name}
                </h3>

                <div className="space-y-2">
                  {/* Ideator */}
                  {feature.credits.ideator && (
                    <div className="flex items-center gap-2">
                      <LightbulbIcon
                        size={14}
                        className="text-[var(--monarch-warning)] flex-shrink-0"
                      />
                      <span
                        className="text-xs"
                        style={{ color: 'var(--monarch-text-muted)' }}
                      >
                        Ideated by
                      </span>
                      <ContributorAvatar
                        username={feature.credits.ideator.username}
                        avatarUrl={feature.credits.ideator.avatarUrl}
                        profileUrl={feature.credits.ideator.profileUrl}
                        size="sm"
                        showUsername
                      />
                    </div>
                  )}

                  {/* Contributors */}
                  {feature.credits.contributors.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <UsersIcon
                        size={14}
                        className="text-[var(--monarch-text-muted)] flex-shrink-0"
                      />
                      <span
                        className="text-xs"
                        style={{ color: 'var(--monarch-text-muted)' }}
                      >
                        Community Devs
                      </span>
                      {feature.credits.contributors.map((c) => (
                        <ContributorAvatar
                          key={c.username}
                          username={c.username}
                          avatarUrl={c.avatarUrl}
                          profileUrl={c.profileUrl}
                          size="sm"
                          showUsername
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
