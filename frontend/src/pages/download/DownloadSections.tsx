/* eslint-disable max-lines */
import { useState } from 'react';
import { InstallationInstructions } from '../../components/marketing/InstallationInstructions';
import { ReleaseNotesSection } from '../../components/marketing/ReleaseNotesSection';
import {
  SpinnerIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  AlertCircleIcon,
  DownloadIcon,
} from '../../components/icons';
import { PLATFORM_LABELS, type Platform } from '../../utils/platformDetection';
import type { GithubRelease } from '../../utils/githubRelease';

type DownloadStatus = 'idle' | 'starting' | 'started' | 'error';

interface DownloadInfo {
  url: string | null;
  size?: string;
  checksum: string | null;
  architecture?: string;
}

interface HeroSectionProps {
  activePlatform: Platform;
  version?: string;
  downloadUrl?: string | null;
  fileSize?: string;
  architecture?: string;
  loading?: boolean;
  downloadStatus?: DownloadStatus;
}

export function HeroSection({
  activePlatform,
  version,
  downloadUrl,
  fileSize,
  architecture,
  loading,
  downloadStatus = 'idle',
}: Readonly<HeroSectionProps>) {
  return (
    <section className="px-4 sm:px-6 pt-8 pb-0">
      <div className="max-w-5xl mx-auto">
        {/* Contained hero with gradient background */}
        <div className="relative rounded-2xl bg-gradient-to-b from-[var(--monarch-bg-hover)] to-[var(--monarch-bg-page)] overflow-hidden">
          {/* Content area */}
          <div className="px-6 sm:px-12 pt-12 pb-8">
            {/* Header */}
            <div className="text-center mb-8">
              <p className="text-sm font-semibold text-[var(--monarch-orange)] uppercase tracking-wider mb-3">
                Free Forever
              </p>
              <h1
                className="text-4xl sm:text-5xl font-bold text-[var(--monarch-text-dark)] mb-4"
                style={{ fontFamily: "'Unbounded', sans-serif" }}
              >
                Eclosion for {activePlatform === 'unknown' ? 'Desktop' : PLATFORM_LABELS[activePlatform]}
              </h1>
              <p className="text-lg text-[var(--monarch-text)] max-w-2xl mx-auto">
                Expand what's possible with Monarch Money. Track recurring expenses, automate savings
                targets, and keep everything in sync.
              </p>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row items-center sm:items-stretch justify-center gap-4 mb-4">
              {downloadUrl && !loading ? (
                <a
                  href={downloadUrl}
                  className="inline-flex flex-col items-center px-8 py-3 rounded-lg bg-[var(--monarch-orange)] text-white hover:bg-[var(--monarch-orange-dark,#e65c00)] transition-colors shadow-lg shadow-[var(--monarch-orange)]/20"
                >
                  <span className="inline-flex items-center gap-2 text-base font-semibold">
                    <DownloadIcon size={20} />
                    Download Eclosion
                  </span>
                  {version && (
                    <span className="text-xs text-white/70 mt-0.5">
                      v{version}
                      {architecture && ` · ${architecture}`}
                      {fileSize && ` · ${fileSize}`}
                    </span>
                  )}
                </a>
              ) : (
                <div className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg text-base font-semibold bg-[var(--monarch-bg-hover)] text-[var(--monarch-text-muted)]">
                  <SpinnerIcon size={20} />
                  Loading...
                </div>
              )}
              <a
                href="/demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-base font-semibold border-2 border-[var(--monarch-border)] text-[var(--monarch-text-dark)] hover:border-[var(--monarch-orange)] hover:text-[var(--monarch-orange)] transition-colors bg-[var(--monarch-bg-card)]"
              >
                Try Demo
              </a>
            </div>

            {/* Download status feedback */}
            {downloadStatus !== 'idle' && downloadUrl && (
              <div className="mt-4 text-center">
                {downloadStatus === 'starting' && (
                  <p className="text-[var(--monarch-text-muted)] flex items-center justify-center gap-2">
                    <SpinnerIcon size={18} />
                    Starting download...
                  </p>
                )}
                {downloadStatus === 'started' && (
                  <p className="text-[var(--monarch-green)] flex items-center justify-center gap-2 font-medium">
                    <CheckCircleIcon size={18} color="var(--monarch-green)" />
                    Download started!
                  </p>
                )}
              </div>
            )}

            {/* Manual download link */}
            {downloadStatus === 'started' && downloadUrl && (
              <p className="mt-2 text-center text-sm text-[var(--monarch-text-muted)]">
                Download not starting?{' '}
                <a href={downloadUrl} className="text-[var(--monarch-orange)] hover:underline font-medium">
                  Click here
                </a>
              </p>
            )}
          </div>

          {/* Product Screenshot - cropped with fade to background */}
          <div className="relative">
            <div className="max-w-4xl mx-auto px-4">
              <div className="relative rounded-xl overflow-hidden" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 12px 24px -8px rgba(0, 0, 0, 0.3)' }}>
                {/* Container with fixed height to show ~1/4 of image */}
                <div className="h-[280px] sm:h-[350px] overflow-hidden">
                  <img
                    src="https://github.com/312-dev/eclosion/releases/latest/download/screenshot-recurring.png"
                    alt="Eclosion - Recurring Expenses Dashboard"
                    className="w-full h-auto"
                    loading="eager"
                  />
                </div>
                {/* Gradient fade overlay */}
                <div
                  className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to bottom, transparent, var(--monarch-bg-page))',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface LoadingStateProps {
  loading: boolean;
  error: string | null;
}

export function LoadingState({ loading, error }: Readonly<LoadingStateProps>) {
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <SpinnerIcon size={32} color="var(--monarch-orange)" />
        <p className="text-[var(--monarch-text-muted)]">Loading download information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <AlertCircleIcon size={32} color="var(--monarch-warning)" />
        <p className="text-[var(--monarch-text)]">{error}</p>
        <a
          href="https://github.com/312-dev/eclosion/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[var(--monarch-orange)] hover:underline"
        >
          View releases on GitHub
          <ExternalLinkIcon size={14} />
        </a>
      </div>
    );
  }

  return null;
}

interface ReleaseNotesSectionWrapperProps {
  release: GithubRelease;
  version: string;
}

export function ReleaseNotesSectionWrapper({
  release,
  version,
}: Readonly<ReleaseNotesSectionWrapperProps>) {
  if (!release.body) return null;

  return (
    <section className="px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <ReleaseNotesSection
          body={release.body}
          version={version}
          htmlUrl={release.html_url}
          publishedAt={release.published_at}
        />
      </div>
    </section>
  );
}

interface InstallationSectionProps {
  platform: Platform;
}

export function InstallationSection({ platform }: Readonly<InstallationSectionProps>) {
  // Only show installation instructions for Linux (macOS and Windows are self-explanatory)
  if (platform !== 'linux') return null;

  return (
    <section className="px-4 sm:px-6 py-12 border-t border-[var(--monarch-border)]">
      <div className="max-w-4xl mx-auto">
        <p className="text-sm font-semibold text-[var(--monarch-orange)] uppercase tracking-wider text-center mb-3">
          Get Started
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--monarch-text-dark)] mb-8 text-center">
          Installation
        </h2>
        <InstallationInstructions platform={platform} hideHeader />
      </div>
    </section>
  );
}

/** Feature card for the features grid */
function FeatureCard({
  icon,
  title,
  description,
  accentColor,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
}) {
  return (
    <div className="p-6 rounded-xl border border-[var(--monarch-border)] bg-[var(--monarch-bg-card)] hover:border-[var(--monarch-orange)] transition-colors">
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
        style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
      >
        {icon}
      </div>
      <h3 className="font-semibold text-[var(--monarch-text-dark)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--monarch-text-muted)] leading-relaxed">{description}</p>
    </div>
  );
}

/** Features section with 4 highlight cards */
export function FeaturesSection() {
  return (
    <section className="px-4 sm:px-6 py-16 border-t border-[var(--monarch-border)]">
      <div className="max-w-4xl mx-auto">
        <p className="text-sm font-semibold text-[var(--monarch-orange)] uppercase tracking-wider text-center mb-3">
          Features
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--monarch-text-dark)] text-center mb-4">
          Discover Eclosion
        </h2>
        <p className="text-[var(--monarch-text)] text-center max-w-2xl mx-auto mb-10">
          A powerful companion app that extends Monarch Money with tools for tracking recurring expenses and planning your budget.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FeatureCard
            accentColor="var(--monarch-orange)"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
            title="Automatic Sync"
            description="Syncs directly with Monarch Money to keep your data always up to date. Changes flow both ways seamlessly."
          />
          <FeatureCard
            accentColor="#10b981"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
            title="Smart Targets"
            description="Automatically calculates monthly savings targets for recurring expenses so you're always prepared."
          />
          <FeatureCard
            accentColor="#6366f1"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            title="Private & Secure"
            description="Your credentials never leave your device. No analytics, no telemetry, no third-party services."
          />
          <FeatureCard
            accentColor="#f59e0b"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            }
            title="Open Source"
            description="Fully transparent, community-driven development. Inspect, modify, or contribute on GitHub."
          />
        </div>
      </div>
    </section>
  );
}

/** FAQ item component */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-[var(--monarch-border)] rounded-xl bg-[var(--monarch-bg-card)] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-[var(--monarch-bg-hover)] transition-colors gap-4"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-[var(--monarch-text-dark)]">{question}</span>
        <svg
          className={`w-5 h-5 shrink-0 text-[var(--monarch-orange)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 pb-5 text-[var(--monarch-text)] leading-relaxed border-t border-[var(--monarch-border)]">
          <p className="pt-4">{answer}</p>
        </div>
      )}
    </div>
  );
}

/** FAQ section */
export function FAQSection() {
  const faqs = [
    {
      question: 'Is Eclosion free?',
      answer:
        'Yes! Eclosion is completely free and open source. You can use it without any cost, and the source code is available on GitHub for review or contribution.',
    },
    {
      question: 'How does Eclosion connect to Monarch Money?',
      answer:
        'Eclosion uses your Monarch Money credentials to authenticate directly with their API. Your credentials are stored securely on your device and are never sent to any third-party servers.',
    },
    {
      question: 'Is the app signed and secure?',
      answer:
        'The macOS version is fully signed and notarized by Apple, so it installs seamlessly. Windows and Linux builds are currently unsigned, but you can verify the source code on GitHub and build the app yourself if preferred.',
    },
    {
      question: 'Does Eclosion work on all operating systems?',
      answer:
        'Eclosion is available for macOS (Intel & Apple Silicon), Windows (x64), and Linux (x64). You can also use the web-based demo to try it out before downloading.',
    },
    {
      question: 'Will my data be safe?',
      answer:
        'Absolutely. Eclosion only communicates with Monarch Money servers. There are no analytics, telemetry, or third-party services. Your financial data stays between you and Monarch.',
    },
    {
      question: 'What happens if Monarch releases a similar feature?',
      answer:
        "We deliberately focus on features outside Monarch's near-term roadmap. If Monarch does release comparable functionality, we'll provide a migration option so you can port your data to their native implementation. Our goal is to enhance your Monarch experience, not compete with it.",
    },
  ];

  return (
    <section className="px-4 sm:px-6 py-16 border-t border-[var(--monarch-border)]">
      <div className="max-w-4xl mx-auto">
        <p className="text-sm font-semibold text-[var(--monarch-orange)] uppercase tracking-wider text-center mb-3">
          FAQ
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--monarch-text-dark)] text-center mb-10">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PreviousVersionsSection() {
  return (
    <section className="px-4 sm:px-6 py-12 border-t border-[var(--monarch-border)]">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-xl font-semibold text-[var(--monarch-text-dark)] mb-3">
          Need an older version?
        </h2>
        <p className="text-[var(--monarch-text-muted)] mb-6">
          Previous releases are available for compatibility or rollback purposes.
        </p>
        <a
          href="https://github.com/312-dev/eclosion/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium border-2 border-[var(--monarch-border)] text-[var(--monarch-text)] hover:border-[var(--monarch-orange)] hover:text-[var(--monarch-orange)] transition-colors"
        >
          View all releases
          <ExternalLinkIcon size={16} />
        </a>
      </div>
    </section>
  );
}

export function FooterLinks() {
  return (
    <section className="px-4 sm:px-6 py-8 text-center border-t border-[var(--monarch-border)]">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6 text-sm">
        <a
          href="https://github.com/312-dev/eclosion"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[var(--monarch-text-muted)] hover:text-[var(--monarch-orange)] transition-colors"
        >
          Source code
          <ExternalLinkIcon size={14} />
        </a>
        <span className="text-[var(--monarch-border)]">·</span>
        <a
          href="/"
          className="text-[var(--monarch-text-muted)] hover:text-[var(--monarch-orange)] transition-colors"
        >
          Back to home
        </a>
      </div>
    </section>
  );
}

export type { DownloadStatus, DownloadInfo };
