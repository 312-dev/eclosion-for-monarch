/**
 * Hero Component
 *
 * Main hero section for the landing page.
 * Features the Eclosion branding with evolution/community positioning.
 * Side-by-side layout on desktop: branding left, IdeasBoard right.
 * Stacked layout on mobile: branding top, IdeasBoard below.
 */

import { ChevronRightIcon } from '../icons';
import { AppIcon } from '../wizards/SetupWizardIcons';
import { IdeasBoard } from './IdeasBoard';

interface HeroProps {
  readonly onGetStarted?: () => void;
  readonly onSeeItInAction?: () => void;
}

export function Hero({ onGetStarted, onSeeItInAction }: HeroProps) {
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

        {/* Evolution tagline */}
        <p className="text-xl sm:text-2xl text-[var(--monarch-orange)] font-medium mb-3">
          Community-refined. Ready to fly.
        </p>

        {/* Subtitle - proven features positioning */}
        <p className="text-lg sm:text-xl text-[var(--monarch-text)] mb-8 max-w-xl mx-auto lg:mx-0">
          New budgeting features that have proven themselves.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
          <button
            type="button"
            onClick={onSeeItInAction}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--monarch-orange)] text-white font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-[var(--monarch-orange)]/20"
          >
            See It In Action
            <ChevronRightIcon size={20} color="white" />
          </button>
          <button
            type="button"
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-[var(--monarch-orange)] text-[var(--monarch-orange)] font-semibold text-lg hover:bg-[var(--monarch-orange)]/10 transition-colors"
          >
            Get Started Free
          </button>
        </div>
      </div>

      {/* Ideas Board side */}
      <div className="flex-1 w-full max-w-md">
        <IdeasBoard />
      </div>
    </section>
  );
}
