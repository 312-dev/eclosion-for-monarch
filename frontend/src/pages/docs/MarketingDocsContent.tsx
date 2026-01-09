/**
 * MarketingDocsContent - Documentation content for marketing site (GitHub Pages)
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FeatureGrid } from '../../components/marketing';
import { GetStartedModal } from '../../components/ui/GetStartedModal';
import { FEATURES } from '../../data/features';
import {
  ChevronRightIcon,
  ExternalLinkIcon,
  GitHubIcon,
  BookmarkIcon,
  ShieldCheckIcon,
} from '../../components/icons';
import { FaqItem } from './FaqItem';

export function MarketingDocsContent() {
  const [showGetStartedModal, setShowGetStartedModal] = useState(false);

  return (
    <>
      {/* Header */}
      <section className="px-4 sm:px-6 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h1
            className="text-4xl sm:text-5xl font-bold text-[var(--monarch-text-dark)] mb-4"
            style={{ fontFamily: "'Unbounded', sans-serif" }}
          >
            Documentation
          </h1>
          <p className="text-lg text-[var(--monarch-text)]">
            Everything you need to get started with Eclosion.
          </p>
        </div>
      </section>

      {/* Quick Links */}
      <section className="px-4 sm:px-6 pb-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Get Started */}
          <button
            type="button"
            onClick={() => setShowGetStartedModal(true)}
            className="flex items-start gap-4 p-6 rounded-xl bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)] hover:border-[var(--monarch-orange)] transition-colors text-left"
          >
            <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-(--monarch-orange)/10">
              <ChevronRightIcon size={24} color="var(--monarch-orange)" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--monarch-text-dark)] mb-1">
                Get Started
              </h3>
              <p className="text-sm text-[var(--monarch-text)]">
                Deploy your own instance in under 5 minutes with Railway or Docker.
              </p>
            </div>
          </button>

          {/* Try Demo */}
          <Link
            to="/demo"
            className="flex items-start gap-4 p-6 rounded-xl bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)] hover:border-[var(--monarch-orange)] transition-colors"
          >
            <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-(--monarch-orange)/10">
              <BookmarkIcon size={24} color="var(--monarch-orange)" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--monarch-text-dark)] mb-1">
                Try the Demo
              </h3>
              <p className="text-sm text-[var(--monarch-text)]">
                Explore Eclosion with sample data. No account required.
              </p>
            </div>
          </Link>

          {/* GitHub */}
          <a
            href="https://github.com/312-dev/eclosion"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-6 rounded-xl bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)] hover:border-[var(--monarch-orange)] transition-colors"
          >
            <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-(--monarch-orange)/10">
              <GitHubIcon size={24} color="var(--monarch-orange)" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--monarch-text-dark)] mb-1 flex items-center gap-2">
                View on GitHub
                <ExternalLinkIcon size={14} />
              </h3>
              <p className="text-sm text-[var(--monarch-text)]">
                Source code, issues, and contribution guidelines.
              </p>
            </div>
          </a>

          {/* Security */}
          <a
            href="https://github.com/312-dev/eclosion#security"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-6 rounded-xl bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)] hover:border-[var(--monarch-orange)] transition-colors"
          >
            <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-(--monarch-orange)/10">
              <ShieldCheckIcon size={24} color="var(--monarch-orange)" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--monarch-text-dark)] mb-1 flex items-center gap-2">
                Security
                <ExternalLinkIcon size={14} />
              </h3>
              <p className="text-sm text-[var(--monarch-text)]">
                How your credentials are protected and encrypted.
              </p>
            </div>
          </a>
        </div>
      </section>

      {/* Features Overview */}
      <section className="px-4 sm:px-6 py-12 bg-[var(--monarch-bg-card)]">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-2xl font-bold text-[var(--monarch-text-dark)] mb-8 text-center"
            style={{ fontFamily: "'Unbounded', sans-serif" }}
          >
            Features
          </h2>
          <FeatureGrid features={FEATURES} showComingSoon unified variant="compact" />
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

      {/* FAQ */}
      <section className="px-4 sm:px-6 py-12 bg-[var(--monarch-bg-card)]">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-2xl font-bold text-[var(--monarch-text-dark)] mb-8 text-center"
            style={{ fontFamily: "'Unbounded', sans-serif" }}
          >
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <FaqItem
              question="Is Eclosion free?"
              answer="Eclosion is completely free. Download the desktop app or self-host with Docker at no cost. Railway hosting is available as an alternative (~$5-7/month for their infrastructure)."
            />
            <FaqItem
              question="Is my Monarch password safe?"
              answer="Yes. Your credentials are encrypted with AES-256 using a passphrase that only you know. The server cannot decrypt your credentials without your passphrase."
            />
            <FaqItem
              question="Does this work with the official Monarch API?"
              answer="Eclosion connects to Monarch Money using the same methods as their web app. It's not an official integration, but it works reliably."
            />
            <FaqItem
              question="Can I use this without Railway?"
              answer="Absolutely! You can self-host with Docker on any server you control. See the self-hosting guide on GitHub Wiki for instructions."
            />
          </div>
        </div>
      </section>

      <GetStartedModal
        isOpen={showGetStartedModal}
        onClose={() => setShowGetStartedModal(false)}
      />
    </>
  );
}
