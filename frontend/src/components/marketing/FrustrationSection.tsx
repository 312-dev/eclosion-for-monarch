/**
 * FrustrationSection
 *
 * "Sound familiar?" section with relatable scenario cards.
 * Validates user frustrations before showing the solution.
 * Cards animate with a dramatic stacking effect - falling in reverse order
 * and bumping previous cards down aggressively.
 */

import { useEffect, useRef, useState } from 'react';
import { Calculator } from 'lucide-react';
import { FrustrationCard } from './FrustrationCard';
import { CustomProblemCard } from './CustomProblemCard';
import { ChevronDownIcon, SearchAlertIcon, WaypointsIcon } from '../icons';
import { useIdeaInputSafe } from '../../context';

const FRUSTRATIONS = [
  {
    id: 'surprise-bill',
    icon: SearchAlertIcon,
    iconColor: 'text-rose-500',
    iconBg: '#F4363615',
    title: 'Blindsided by a bill',
    description:
      "Your car insurance bill arrives and you're $200 short because you forgot to save monthly for a semi-annual expense.",
    yesText: 'Ugh, yes',
    noText: 'Not me',
    solutionMessage: "We got you. You'll always know what's coming.",
  },
  {
    id: 'subscription-sprawl',
    icon: WaypointsIcon,
    iconColor: 'text-violet-500',
    iconBg: '#8B5CF615',
    title: 'Subscription chaos',
    description:
      "You track 15 small subscriptions but they're scattered across your budget with no clear total.",
    yesText: 'Totally',
    noText: "I'm organized",
    solutionMessage: 'Fixed that. One dashboard for everything.',
  },
  {
    id: 'math-problem',
    icon: Calculator,
    iconColor: 'text-amber-500',
    iconBg: '#F59E0B15',
    title: 'Manual math every month',
    description:
      'You wish Monarch would just calculate how much to save each month for that annual Amazon Prime renewal.',
    yesText: 'Every time',
    noText: 'I like math',
    solutionMessage: 'Already solved. We do the math for you.',
  },
];

// Animation timing (ms)
const FALL_DURATION = 600;
const DELAY_BETWEEN_CARDS = 900;

interface FrustrationSectionProps {
  readonly onShowSolution?: () => void;
}

type AnimationPhase = 'hidden' | 'falling' | 'landed' | 'bumped';

interface CardState {
  phase: AnimationPhase;
  bumpCount: number; // How many times this card has been bumped
}

export function FrustrationSection({ onShowSolution }: FrustrationSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  // Track animation state for each card (indexed by visual order, not data order)
  // Visual order: card 3 falls first (index 0), then 2 (index 1), then 1 (index 2)
  const [cardStates, setCardStates] = useState<CardState[]>([
    { phase: 'hidden', bumpCount: 0 },
    { phase: 'hidden', bumpCount: 0 },
    { phase: 'hidden', bumpCount: 0 },
  ]);

  const visibleFrustrations = FRUSTRATIONS.filter((f) => !dismissedIds.has(f.id));
  const showCustomProblemCard = visibleFrustrations.length <= 2;
  const isStageMode = visibleFrustrations.length === 0;

  // Coordinate with IdeasBoard input via context
  const ideaInput = useIdeaInputSafe();

  // Signal when the bottom input becomes visible
  useEffect(() => {
    ideaInput?.setBottomInputVisible(showCustomProblemCard);
  }, [showCustomProblemCard, ideaInput]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Orchestrate the stacking animation when section becomes visible
  useEffect(() => {
    if (!isVisible) return;

    // Card 3 (last in data, first to fall) - falls at index 0
    const timer1 = setTimeout(() => {
      setCardStates([
        { phase: 'falling', bumpCount: 0 },
        { phase: 'hidden', bumpCount: 0 },
        { phase: 'hidden', bumpCount: 0 },
      ]);
    }, 0);

    const timer1Land = setTimeout(() => {
      setCardStates([
        { phase: 'landed', bumpCount: 0 },
        { phase: 'hidden', bumpCount: 0 },
        { phase: 'hidden', bumpCount: 0 },
      ]);
    }, FALL_DURATION);

    // Card 2 falls, bumps card 3 down
    const timer2 = setTimeout(() => {
      setCardStates([
        { phase: 'bumped', bumpCount: 1 }, // Card 3 gets bumped
        { phase: 'falling', bumpCount: 0 }, // Card 2 falls
        { phase: 'hidden', bumpCount: 0 },
      ]);
    }, DELAY_BETWEEN_CARDS);

    const timer2Land = setTimeout(() => {
      setCardStates([
        { phase: 'landed', bumpCount: 1 },
        { phase: 'landed', bumpCount: 0 },
        { phase: 'hidden', bumpCount: 0 },
      ]);
    }, DELAY_BETWEEN_CARDS + FALL_DURATION);

    // Card 1 falls, bumps cards 2 and 3 down
    const timer3 = setTimeout(() => {
      setCardStates([
        { phase: 'bumped', bumpCount: 2 }, // Card 3 gets bumped again
        { phase: 'bumped', bumpCount: 1 }, // Card 2 gets bumped
        { phase: 'falling', bumpCount: 0 }, // Card 1 falls
      ]);
    }, DELAY_BETWEEN_CARDS * 2);

    const timer3Land = setTimeout(() => {
      setCardStates([
        { phase: 'landed', bumpCount: 2 },
        { phase: 'landed', bumpCount: 1 },
        { phase: 'landed', bumpCount: 0 },
      ]);
    }, DELAY_BETWEEN_CARDS * 2 + FALL_DURATION);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer1Land);
      clearTimeout(timer2);
      clearTimeout(timer2Land);
      clearTimeout(timer3);
      clearTimeout(timer3Land);
    };
  }, [isVisible]);

  // Reorder frustrations for animation: 3rd falls first, then 2nd, then 1st
  // But they render in their final visual positions
  const getCardAnimationClass = (dataIndex: number): string => {
    // Map data index to animation slot:
    // dataIndex 0 (Blindsided) -> animates 3rd (slot 2)
    // dataIndex 1 (Subscription) -> animates 2nd (slot 1)
    // dataIndex 2 (Manual math) -> animates 1st (slot 0)
    const animSlot = 2 - dataIndex;
    const state = cardStates[animSlot] ?? { phase: 'hidden', bumpCount: 0 };

    if (state.phase === 'hidden') return 'frustration-hidden';
    if (state.phase === 'falling') return 'frustration-falling';
    if (state.phase === 'bumped') return `frustration-bumped frustration-bump-${state.bumpCount}`;
    return 'frustration-landed';
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  return (
    <section
      ref={sectionRef}
      className="relative px-4 sm:px-6 pt-16 pb-20 bg-[var(--monarch-bg-page)] overflow-x-clip overflow-y-visible"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h2
          className="text-2xl sm:text-3xl font-bold text-[var(--monarch-text-dark)] text-center mb-10 transition-opacity duration-300"
          style={{ fontFamily: "'Unbounded', sans-serif" }}
        >
          {isStageMode ? (
            'The stage is yours...'
          ) : (
            <>
              Sound familiar<span className="question-mark-pulse">?</span>
            </>
          )}
        </h2>

        {/* Cards container - uses flex for animatable width transitions */}
        <div className="flex flex-wrap gap-4">
          {FRUSTRATIONS.map((frustration, index) => {
            if (dismissedIds.has(frustration.id)) return null;
            return (
              <FrustrationCard
                key={frustration.id}
                icon={frustration.icon}
                iconColor={frustration.iconColor}
                iconBg={frustration.iconBg}
                title={frustration.title}
                description={frustration.description}
                yesText={frustration.yesText}
                noText={frustration.noText}
                solutionMessage={frustration.solutionMessage}
                animationClass={getCardAnimationClass(index)}
                onDismiss={() => handleDismiss(frustration.id)}
              />
            );
          })}
          {showCustomProblemCard && (
            <CustomProblemCard
              animationClass="frustration-landed"
              colSpan={(3 - visibleFrustrations.length) as 1 | 2 | 3}
            />
          )}
        </div>
      </div>

      {/* Pill floating on section boundary */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center z-10 translate-y-1/2">
        <button
          type="button"
          onClick={onShowSolution}
          className="px-8 py-3 bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)] rounded-full text-lg font-medium text-[var(--monarch-text-dark)] shadow-sm flex items-center gap-2 hover:border-[var(--monarch-orange)] hover:shadow-md transition-all cursor-pointer"
        >
          {isStageMode ? 'In the meantime' : "There's a better way"}
          <ChevronDownIcon size={20} className="animate-bounce-down" />
        </button>
      </div>
    </section>
  );
}
