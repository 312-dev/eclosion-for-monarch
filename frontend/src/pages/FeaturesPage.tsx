/**
 * Features Page
 *
 * Full showcase of all Eclosion features.
 * Shows available and coming-soon features.
 */

import { DocsLayout, FeatureGrid } from '../components/marketing';
import { FEATURES, getFeatureCounts } from '../data/features';

export function FeaturesPage() {
  const counts = getFeatureCounts();

  return (
    <DocsLayout>
      {/* Header */}
      <section className="px-4 sm:px-6 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h1
            className="text-4xl sm:text-5xl font-bold text-[var(--monarch-text-dark)] mb-4"
            style={{ fontFamily: "'Unbounded', sans-serif" }}
          >
            The Eclosion Toolkit
          </h1>
          <p className="text-lg text-[var(--monarch-text)] mb-6">
            Powerful tools that work with your Monarch Money account.
            Each feature can be enabled independently.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 text-sm">
            <div>
              <span className="text-2xl font-bold text-[var(--monarch-orange)]">
                {counts.available}
              </span>
              <span className="text-[var(--monarch-text-muted)] ml-2">
                Available
              </span>
            </div>
            {counts.comingSoon > 0 && (
              <div>
                <span className="text-2xl font-bold text-[var(--monarch-warning)]">
                  {counts.comingSoon}
                </span>
                <span className="text-[var(--monarch-text-muted)] ml-2">
                  Coming Soon
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <FeatureGrid features={FEATURES} showComingSoon variant="detailed" />
        </div>
      </section>
    </DocsLayout>
  );
}
