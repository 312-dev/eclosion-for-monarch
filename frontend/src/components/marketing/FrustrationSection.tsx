/**
 * FrustrationSection
 *
 * "Sound familiar?" section with relatable scenario cards.
 * Validates user frustrations before showing the solution.
 */

import { FrustrationCard } from './FrustrationCard';
import { AlertCircleIcon, ChevronDownIcon, RepeatIcon, TrendDownIcon } from '../icons';

const FRUSTRATIONS = [
  {
    id: 'surprise-bill',
    icon: AlertCircleIcon,
    iconColor: 'text-rose-500',
    iconBg: '#F4363615',
    title: 'The Surprise Bill',
    description:
      "Your car insurance bill arrives and you're $200 short because you forgot to save monthly for a semi-annual expense.",
  },
  {
    id: 'subscription-sprawl',
    icon: RepeatIcon,
    iconColor: 'text-violet-500',
    iconBg: '#8B5CF615',
    title: 'The Subscription Sprawl',
    description:
      "You track 15 small subscriptions but they're scattered across your budget with no clear total.",
  },
  {
    id: 'math-problem',
    icon: TrendDownIcon,
    iconColor: 'text-amber-500',
    iconBg: '#F59E0B15',
    title: 'The Math Problem',
    description:
      'You wish Monarch would just calculate how much to save each month for that annual Amazon Prime renewal.',
  },
];

interface FrustrationSectionProps {
  readonly onShowSolution?: () => void;
}

export function FrustrationSection({ onShowSolution }: FrustrationSectionProps) {
  return (
    <section className="relative px-4 sm:px-6 pt-16 pb-20 bg-[var(--monarch-bg-page)]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h2
          className="text-2xl sm:text-3xl font-bold text-[var(--monarch-text-dark)] text-center mb-10"
          style={{ fontFamily: "'Unbounded', sans-serif" }}
        >
          Sound familiar?
        </h2>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FRUSTRATIONS.map((frustration) => (
            <FrustrationCard
              key={frustration.id}
              icon={frustration.icon}
              iconColor={frustration.iconColor}
              iconBg={frustration.iconBg}
              title={frustration.title}
              description={frustration.description}
            />
          ))}
        </div>
      </div>

      {/* Pill floating on section boundary */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center z-10 translate-y-1/2">
        <button
          type="button"
          onClick={onShowSolution}
          className="px-8 py-3 bg-white border border-[var(--monarch-border)] rounded-full text-lg font-medium text-[var(--monarch-text-dark)] shadow-sm flex items-center gap-2 hover:border-[var(--monarch-orange)] hover:shadow-md transition-all cursor-pointer"
        >
          There&apos;s a better way
          <ChevronDownIcon size={20} className="animate-bounce-down" />
        </button>
      </div>
    </section>
  );
}
