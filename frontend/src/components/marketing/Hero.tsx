/**
 * Hero Component
 *
 * Main hero section for the landing page.
 * Features the Eclosion branding with toolkit positioning.
 */

import { Link } from 'react-router-dom';
import { ChevronRightIcon } from '../icons';
import { AppIcon } from '../wizards/SetupWizardIcons';

interface HeroProps {
  onGetStarted?: () => void;
}

export function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center">
      <div className="max-w-3xl mx-auto">
        {/* Animated Logo */}
        <div className="flex justify-center mb-8">
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

        {/* Toolkit positioning tagline */}
        <p className="text-xl sm:text-2xl text-[var(--monarch-orange)] font-medium mb-3">
          Extra features for Monarch Money
        </p>

        {/* Subtitle - accessible explanation */}
        <p className="text-lg sm:text-xl text-[var(--monarch-text)] mb-6 max-w-xl mx-auto">
          A free, open-source toolkit that adds budgeting features Monarch doesn't have yet.
          You own it completely — set it up once, and it runs automatically.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--monarch-orange)] text-white font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-[var(--monarch-orange)]/20"
          >
            Try the Demo
            <ChevronRightIcon size={20} color="white" />
          </Link>
          <button
            type="button"
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-[var(--monarch-orange)] text-[var(--monarch-orange)] font-semibold text-lg hover:bg-(--monarch-orange)/10 transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    </section>
  );
}
