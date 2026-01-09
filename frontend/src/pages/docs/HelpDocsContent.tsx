/**
 * HelpDocsContent - Documentation content for self-hosted instances
 */

import { Link } from 'react-router-dom';
import {
  ExternalLinkIcon,
  GitHubIcon,
  BookmarkIcon,
  InfoIcon,
  ShieldCheckIcon,
} from '../../components/icons';
import { FaqItem } from './FaqItem';

export function HelpDocsContent() {
  return (
    <>
      {/* Header */}
      <section className="px-4 sm:px-6 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h1
            className="text-4xl sm:text-5xl font-bold text-[var(--monarch-text-dark)] mb-4"
            style={{ fontFamily: "'Unbounded', sans-serif" }}
          >
            Help & Support
          </h1>
          <p className="text-lg text-[var(--monarch-text)]">
            Documentation and resources for your Eclosion instance.
          </p>
        </div>
      </section>

      {/* Quick Links */}
      <section className="px-4 sm:px-6 pb-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Version Info */}
          <div className="p-6 rounded-xl bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)]">
            <div className="flex items-center gap-3 mb-4">
              <InfoIcon size={24} color="var(--monarch-orange)" />
              <h3 className="font-semibold text-[var(--monarch-text-dark)]">
                Version Information
              </h3>
            </div>
            <p className="text-sm text-[var(--monarch-text)] mb-4">
              You're running the latest version of Eclosion.
            </p>
            <a
              href="https://github.com/312-dev/eclosion/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--monarch-orange)] hover:underline flex items-center gap-1"
            >
              View Changelog
              <ExternalLinkIcon size={14} />
            </a>
          </div>

          {/* GitHub Issues */}
          <a
            href="https://github.com/312-dev/eclosion/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 rounded-xl bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)] hover:border-[var(--monarch-orange)] transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <GitHubIcon size={24} color="var(--monarch-orange)" />
              <h3 className="font-semibold text-[var(--monarch-text-dark)] flex items-center gap-2">
                Report an Issue
                <ExternalLinkIcon size={14} />
              </h3>
            </div>
            <p className="text-sm text-[var(--monarch-text)]">
              Found a bug or have a feature request? Open an issue on GitHub.
            </p>
          </a>

          {/* Security */}
          <a
            href="https://github.com/312-dev/eclosion/blob/main/SECURITY.md"
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 rounded-xl bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)] hover:border-[var(--monarch-orange)] transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheckIcon size={24} color="var(--monarch-orange)" />
              <h3 className="font-semibold text-[var(--monarch-text-dark)] flex items-center gap-2">
                Security Policy
                <ExternalLinkIcon size={14} />
              </h3>
            </div>
            <p className="text-sm text-[var(--monarch-text)]">
              Report security vulnerabilities responsibly.
            </p>
          </a>

          {/* Settings */}
          <Link
            to="/settings"
            className="p-6 rounded-xl bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)] hover:border-[var(--monarch-orange)] transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <BookmarkIcon size={24} color="var(--monarch-orange)" />
              <h3 className="font-semibold text-[var(--monarch-text-dark)]">
                Settings
              </h3>
            </div>
            <p className="text-sm text-[var(--monarch-text)]">
              Configure your instance, manage credentials, and more.
            </p>
          </Link>
        </div>
      </section>

      {/* Help Topics */}
      <section className="px-4 sm:px-6 py-12 bg-[var(--monarch-bg-card)]">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-2xl font-bold text-[var(--monarch-text-dark)] mb-8 text-center"
            style={{ fontFamily: "'Unbounded', sans-serif" }}
          >
            Common Questions
          </h2>
          <div className="space-y-4">
            <FaqItem
              question="How do I update Eclosion?"
              answer="If you're on Railway, updates are applied automatically when you merge them from the template. For Docker, run 'docker compose pull && docker compose up -d'."
            />
            <FaqItem
              question="How do I change my Monarch password?"
              answer="Go to Settings > Credentials and enter your new password. Your passphrase remains the same."
            />
            <FaqItem
              question="How do I backup my data?"
              answer="For Docker: 'docker compose cp eclosion:/app/state ./backup'. For Railway: Data is persisted in the volume automatically."
            />
            <FaqItem
              question="How do I completely reset?"
              answer="Go to Settings > Tear Down to delete all categories and reset your instance."
            />
          </div>
        </div>
      </section>
    </>
  );
}
