/**
 * Landing Page
 *
 * Marketing page shown at the root URL (/).
 * Positions Eclosion as a toolkit with multiple features.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DocsLayout, Hero, FeatureGrid } from '../components/marketing';
import { GetStartedModal } from '../components/ui/GetStartedModal';
import { FEATURES } from '../data/features';
import {
  CheckCircleIcon,
  ShieldCheckIcon,
  SyncIcon,
} from '../components/icons';

function HowItWorksStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-xl bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)]">
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[var(--monarch-orange)] text-white font-bold text-lg">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-[var(--monarch-text-dark)] mb-1">
          {title}
        </h3>
        <p className="text-sm text-[var(--monarch-text)]">{description}</p>
      </div>
    </div>
  );
}

function ValueProp({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-6">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-(--monarch-orange)/10 mb-4">
        <Icon size={24} color="var(--monarch-orange)" />
      </div>
      <h3 className="font-semibold text-[var(--monarch-text-dark)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[var(--monarch-text)]">{description}</p>
    </div>
  );
}

export function LandingPage() {
  const [showGetStartedModal, setShowGetStartedModal] = useState(false);

  return (
    <DocsLayout minimal>
      {/* Hero Section */}
      <Hero onGetStarted={() => setShowGetStartedModal(true)} />

      {/* Features Section */}
      <section className="px-4 sm:px-6 py-16 bg-[var(--monarch-bg-page)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl font-bold text-[var(--monarch-text-dark)] mb-4"
              style={{ fontFamily: "'Unbounded', sans-serif" }}
            >
              The Toolkit
            </h2>
            <p className="text-lg text-[var(--monarch-text)] max-w-2xl mx-auto">
              Each tool works independently with your Monarch Money account.
              Enable only what you need.
            </p>
          </div>

          <FeatureGrid features={FEATURES} showComingSoon unified variant="detailed" />

          <div className="text-center mt-8">
            <Link
              to="/features"
              className="text-[var(--monarch-orange)] font-medium hover:underline"
            >
              View all features →
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="px-4 sm:px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ValueProp
              icon={ShieldCheckIcon}
              title="Fully Yours"
              description="You own your copy of Eclosion completely. Your credentials stay encrypted on your server — no one else can access them."
            />
            <ValueProp
              icon={SyncIcon}
              title="Always In Sync"
              description="Changes you make in Eclosion show up in Monarch automatically. No manual updates needed."
            />
            <ValueProp
              icon={CheckCircleIcon}
              title="Set It & Forget It"
              description="Turn on the features you want, and Eclosion handles the rest in the background."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 sm:px-6 py-16 bg-[var(--monarch-bg-card)]">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-2xl font-bold text-[var(--monarch-text-dark)] text-center mb-10"
            style={{ fontFamily: "'Unbounded', sans-serif" }}
          >
            How It Works
          </h2>

          <div className="space-y-4">
            <HowItWorksStep
              number={1}
              title="Create Your Eclosion"
              description="Click one button to set up your own private copy. It takes about 5 minutes and costs around $5/month."
            />
            <HowItWorksStep
              number={2}
              title="Sign In with Monarch"
              description="Connect your Monarch Money account. Your password is encrypted and only you can access it."
            />
            <HowItWorksStep
              number={3}
              title="Pick Your Features"
              description="Turn on the tools you want to use. Eclosion syncs with Monarch and keeps everything updated for you."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-3xl font-bold text-[var(--monarch-text-dark)] mb-4"
            style={{ fontFamily: "'Unbounded', sans-serif" }}
          >
            Ready to evolve your budget?
          </h2>
          <p className="text-lg text-[var(--monarch-text)] mb-8">
            Try the demo to see how it works, or deploy your own instance today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--monarch-orange)] text-white font-semibold text-lg hover:opacity-90 transition-opacity"
            >
              Try the Demo
            </Link>
            <button
              type="button"
              onClick={() => setShowGetStartedModal(true)}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-[var(--monarch-orange)] text-[var(--monarch-orange)] font-semibold text-lg hover:bg-(--monarch-orange)/10 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Get Started Modal */}
      <GetStartedModal
        isOpen={showGetStartedModal}
        onClose={() => setShowGetStartedModal(false)}
      />
    </DocsLayout>
  );
}
