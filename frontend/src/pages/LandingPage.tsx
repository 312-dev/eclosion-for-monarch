/**
 * Landing Page
 *
 * Marketing page shown at the root URL (/).
 * Positions Eclosion as a toolkit with multiple features.
 */

import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  DocsLayout,
  Hero,
  FeatureGrid,
  FrustrationSection,
  TransformationSection,
  SocialProofBar,
  WhyEclosionSection,
} from '../components/marketing';
import { GetStartedModal } from '../components/ui/GetStartedModal';
import { IdeaInputProvider, CoderModeProvider } from '../context';
import { FEATURES } from '../data/features';
import { CocoonIcon, ButterflyIcon, CloudSunIcon } from '../components/icons';
import { scrollToElement } from '../utils';

interface HowItWorksStepProps {
  readonly icon: React.ComponentType<{ size?: number; className?: string }>;
  readonly iconBg: string;
  readonly iconColor: string;
  readonly accentColor: string;
  readonly title: string;
  readonly children: React.ReactNode;
}

function HowItWorksStep({
  icon: Icon,
  iconBg,
  iconColor,
  accentColor,
  title,
  children,
}: HowItWorksStepProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="p-6 rounded-2xl border transition-all duration-300"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        borderColor: isHovered ? accentColor : 'var(--monarch-border)',
        boxShadow: isHovered ? `0 8px 32px -8px ${accentColor}50` : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={24} className={iconColor} />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-(--monarch-text-dark) mb-2">{title}</h3>
          <p className="text-(--monarch-text) leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [showGetStartedModal, setShowGetStartedModal] = useState(false);
  const transformationRef = useRef<HTMLElement>(null);

  const scrollToTransformation = () => {
    scrollToElement(transformationRef.current, { behavior: 'smooth' });
  };

  return (
    <CoderModeProvider>
      <IdeaInputProvider>
        <DocsLayout>
          {/* Hero Section */}
          <Hero onGetStarted={() => setShowGetStartedModal(true)} />

          {/* Frustration Validation Section */}
          <FrustrationSection onShowSolution={scrollToTransformation} />

          {/* Transformation Preview Section */}
          <section ref={transformationRef}>
            <TransformationSection />
          </section>

          {/* Features Section (The Toolkit) */}
          <section className="px-4 sm:px-6 py-16 bg-(--monarch-bg-page)">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2
                  className="text-3xl font-bold text-(--monarch-text-dark) mb-4"
                  style={{ fontFamily: "'Unbounded', sans-serif" }}
                >
                  Your toolkit, your rules
                </h2>
                <p className="text-lg text-(--monarch-text) max-w-2xl mx-auto">
                  Each feature works independently. Enable only what you need.
                </p>
              </div>

              <FeatureGrid features={FEATURES} showComingSoon unified variant="detailed" />

              <div className="text-center mt-8">
                <Link
                  to="/features"
                  className="text-(--monarch-orange) font-medium hover:underline"
                >
                  View all features →
                </Link>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="px-4 sm:px-6 py-16 bg-(--monarch-bg-card)">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10">
                <h2
                  className="text-2xl font-bold text-(--monarch-text-dark) mb-2"
                  style={{ fontFamily: "'Unbounded', sans-serif" }}
                >
                  Ready to emerge?
                </h2>
                <p className="text-(--monarch-text)">
                  Five minutes to set up. Zero maintenance after.
                </p>
              </div>

              <div className="space-y-5">
                <HowItWorksStep
                  icon={CocoonIcon}
                  iconBg="#3B82F615"
                  iconColor="text-blue-500"
                  accentColor="#3B82F6"
                  title="Spin Your Cocoon"
                >
                  Get your own private copy. Download the desktop app or self-host with Docker on
                  your own server.
                </HowItWorksStep>

                <HowItWorksStep
                  icon={ButterflyIcon}
                  iconBg="#8B5CF615"
                  iconColor="text-violet-500"
                  accentColor="#8B5CF6"
                  title="Unfold Your Wings"
                >
                  Sign in with your Monarch credentials. Encrypted and stored only on your server.
                </HowItWorksStep>

                <HowItWorksStep
                  icon={CloudSunIcon}
                  iconBg="#F59E0B15"
                  iconColor="text-amber-500"
                  accentColor="#F59E0B"
                  title="Emerge & Take Flight"
                >
                  Enable the features you want. Eclosion handles everything automatically from here.
                </HowItWorksStep>
              </div>
            </div>
          </section>

          {/* Social Proof Section */}
          <SocialProofBar />

          {/* Why Eclosion Section */}
          <WhyEclosionSection />

          {/* CTA Section */}
          <section className="px-4 sm:px-6 py-20 bg-(--monarch-bg-page)">
            <div className="max-w-2xl mx-auto text-center">
              <h2
                className="text-3xl font-bold text-(--monarch-text-dark) mb-4"
                style={{ fontFamily: "'Unbounded', sans-serif" }}
              >
                Ready to let your budget take flight?
              </h2>
              <p className="text-lg text-(--monarch-text) mb-8">
                Try the demo to see how it works, or deploy your own instance today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/demo/"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-(--monarch-orange) text-white font-semibold text-lg hover:opacity-90 transition-opacity"
                >
                  Try the Demo
                </Link>
                <button
                  type="button"
                  onClick={() => setShowGetStartedModal(true)}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-(--monarch-orange) text-(--monarch-orange) font-semibold text-lg hover:bg-(--monarch-orange)/10 transition-colors"
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
      </IdeaInputProvider>
    </CoderModeProvider>
  );
}
