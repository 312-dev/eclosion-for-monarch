/**
 * Hero Component
 *
 * Main hero section for the landing page.
 * Features the Eclosion branding with evolution/community positioning.
 * Side-by-side layout on desktop: branding left, IdeasBoard right.
 * Stacked layout on mobile: branding top, IdeasBoard below.
 */

import {
  ChevronRightIcon,
  WindowsIcon,
  AppleIcon,
  LinuxIcon,
  GlobeIcon,
} from '../icons';
import { AppIcon } from '../wizards/SetupWizardIcons';
import { IdeasBoard } from './IdeasBoard';
import { CoderModeToggle } from './CoderModeToggle';

interface HeroProps {
  readonly onGetStarted?: () => void;
  readonly demoHref?: string;
}

export function Hero({ onGetStarted, demoHref = '/demo' }: HeroProps) {
  return (
    <section className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 px-6 py-16 md:py-24 bg-[var(--monarch-bg-card)]">
      {/* Branding side */}
      <div className="flex-1 max-w-lg text-center lg:text-left">
        {/* Animated Logo */}
        <div className="flex justify-center lg:justify-start mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-[var(--monarch-orange)] opacity-20 blur-2xl rounded-full" />
            <div className="relative">
              <AppIcon size={96} />
            </div>
          </div>
        </div>

        {/* Title with Unbounded font */}
        <h1
          className="text-5xl sm:text-6xl md:text-7xl font-bold text-[var(--monarch-text-dark)] mb-4"
          style={{ fontFamily: "'Unbounded', sans-serif", letterSpacing: '-0.02em' }}
        >
          Eclosion
        </h1>

        {/* Tagline */}
        <p className="text-xl sm:text-2xl text-[var(--monarch-orange)] font-medium mb-3">
          Helping Monarch spread its wings
        </p>

        {/* Subtitle - community positioning */}
        <p className="text-lg sm:text-xl text-[var(--monarch-text)] mb-8 max-w-xl mx-auto lg:mx-0">
          Built by budgeters, for budgeters.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
          <button
            type="button"
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--monarch-orange)] text-white font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-[var(--monarch-orange)]/20"
          >
            Start Here
            <ChevronRightIcon size={20} color="white" />
          </button>
          <a
            href={demoHref}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-[var(--monarch-orange)] text-[var(--monarch-orange)] font-semibold text-lg hover:bg-[var(--monarch-orange)]/10 transition-colors"
          >
            Explore Demo
          </a>
        </div>

        {/* Platform Icons */}
        <div className="flex items-center justify-center lg:justify-start gap-4 mt-6">
          <span className="text-sm text-[var(--monarch-text-muted)]">
            Available for:
          </span>
          <div className="flex items-center gap-3">
            <a
              href="/download?platform=windows"
              aria-label="Download for Windows"
              className="p-2 rounded-lg text-[var(--monarch-text-muted)] hover:text-[var(--monarch-orange)] hover:bg-[var(--monarch-bg-hover)] transition-colors"
            >
              <WindowsIcon size={22} />
            </a>
            <a
              href="/download?platform=macos"
              aria-label="Download for macOS"
              className="p-2 rounded-lg text-[var(--monarch-text-muted)] hover:text-[var(--monarch-orange)] hover:bg-[var(--monarch-bg-hover)] transition-colors"
            >
              <AppleIcon size={22} />
            </a>
            <a
              href="/download?platform=linux"
              aria-label="Download for Linux"
              className="p-2 rounded-lg text-[var(--monarch-text-muted)] hover:text-[var(--monarch-orange)] hover:bg-[var(--monarch-bg-hover)] transition-colors"
            >
              <LinuxIcon size={22} />
            </a>
            <span className="w-px h-5 bg-[var(--monarch-border)]" />
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onGetStarted?.();
              }}
              aria-label="Cloud hosted (24/7)"
              className="p-2 rounded-lg text-[var(--monarch-text-muted)] hover:text-[var(--monarch-orange)] hover:bg-[var(--monarch-bg-hover)] transition-colors"
              title="24/7 Cloud Hosted"
            >
              <GlobeIcon size={22} />
            </a>
          </div>
        </div>

        {/* Coder Mode Toggle */}
        <div className="mt-6 flex justify-center lg:justify-start">
          <CoderModeToggle />
        </div>
      </div>

      {/* Ideas Board side */}
      <div className="flex-1 w-full max-w-md">
        <IdeasBoard />
      </div>
    </section>
  );
}
