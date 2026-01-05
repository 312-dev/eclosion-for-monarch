/**
 * Feature Detail Page
 *
 * In-depth view of a single feature.
 * Shows description, benefits, and demo access.
 */

import { useParams, Link, Navigate } from 'react-router-dom';
import { DocsLayout, BenefitsList } from '../components/marketing';
import { Icons, ChevronLeftIcon, ChevronRightIcon } from '../components/icons';
import { ContributorList } from '../components/ui/ContributorList';
import { useContributors } from '../hooks/useContributors';
import { getFeatureById } from '../data/features';

function StatusBadge({ status }: { status: 'available' | 'coming-soon' | 'beta' }) {
  const styles = {
    available: 'bg-[var(--monarch-success-bg)] text-[var(--monarch-success)]',
    'coming-soon': 'bg-[var(--monarch-warning-bg)] text-[var(--monarch-warning)]',
    beta: 'bg-[var(--monarch-info-bg)] text-[var(--monarch-info)]',
  };

  const labels = {
    available: 'Available Now',
    'coming-soon': 'Coming Soon',
    beta: 'Beta',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function FeatureDetailPage() {
  const { featureId } = useParams<{ featureId: string }>();
  const feature = featureId ? getFeatureById(featureId) : undefined;
  const contributorData = useContributors(featureId ?? '');

  // 404 for unknown features
  if (!feature) {
    return <Navigate to="/features" replace />;
  }

  const IconComponent = Icons[feature.icon];
  const isAvailable = feature.status === 'available';
  const hasContributors =
    contributorData &&
    (contributorData.ideator || contributorData.contributors.length > 0);

  return (
    <DocsLayout>
      {/* Breadcrumbs */}
      <div className="px-4 sm:px-6 py-4 border-b border-[var(--monarch-border)]">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm">
            <Link
              to="/"
              className="text-[var(--monarch-text-muted)] hover:text-[var(--monarch-text-dark)]"
            >
              Home
            </Link>
            <ChevronRightIcon size={14} color="var(--monarch-text-muted)" />
            <Link
              to="/features"
              className="text-[var(--monarch-text-muted)] hover:text-[var(--monarch-text-dark)]"
            >
              Features
            </Link>
            <ChevronRightIcon size={14} color="var(--monarch-text-muted)" />
            <span className="text-[var(--monarch-text-dark)] font-medium">
              {feature.name}
            </span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <section className="px-4 sm:px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Icon */}
            <div className="flex-shrink-0 flex items-center justify-center w-20 h-20 rounded-2xl bg-(--monarch-orange)/10">
              <IconComponent size={40} color="var(--monarch-orange)" />
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1
                  className="text-3xl sm:text-4xl font-bold text-[var(--monarch-text-dark)]"
                  style={{ fontFamily: "'Unbounded', sans-serif" }}
                >
                  {feature.name}
                </h1>
                <StatusBadge status={feature.status} />
              </div>

              <p className="text-xl text-[var(--monarch-orange)] font-medium mb-4">
                {feature.tagline}
              </p>

              <p className="text-lg text-[var(--monarch-text)] mb-6">
                {feature.description}
              </p>

              {/* Contributors */}
              {hasContributors && (
                <div className="mb-6 p-4 rounded-lg bg-[var(--monarch-bg-page)] border border-[var(--monarch-border)]">
                  <ContributorList
                    ideator={contributorData?.ideator}
                    contributors={contributorData?.contributors ?? []}
                    variant="detailed"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-4">
                {isAvailable && feature.demoPath && (
                  <Link
                    to={feature.demoPath}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--monarch-orange)] text-white font-medium hover:opacity-90 transition-opacity"
                  >
                    Try the Demo
                    <ChevronRightIcon size={18} color="white" />
                  </Link>
                )}
                <Link
                  to="/docs"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[var(--monarch-border)] text-[var(--monarch-text-dark)] font-medium hover:bg-[var(--monarch-bg-hover)] transition-colors"
                >
                  View Documentation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 sm:px-6 py-12 bg-[var(--monarch-bg-card)]">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-2xl font-bold text-[var(--monarch-text-dark)] mb-8"
            style={{ fontFamily: "'Unbounded', sans-serif" }}
          >
            Key Features
          </h2>
          <BenefitsList benefits={feature.benefits} layout="grid" />
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[var(--monarch-text-dark)] mb-4">
            {isAvailable
              ? 'Ready to get started?'
              : 'Coming soon!'}
          </h2>
          <p className="text-[var(--monarch-text)] mb-6">
            {isAvailable
              ? 'Deploy your own Eclosion instance and start using this feature today.'
              : `${feature.name} is coming soon. Deploy now to be ready when it launches.`}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 text-[var(--monarch-text-muted)] hover:text-[var(--monarch-text-dark)]"
            >
              <ChevronLeftIcon size={18} />
              Back to Features
            </Link>
          </div>
        </div>
      </section>
    </DocsLayout>
  );
}
