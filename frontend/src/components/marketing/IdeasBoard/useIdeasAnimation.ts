/**
 * useIdeasAnimation Hook
 *
 * Manages the animation state for the Ideas Board component.
 *
 * Animation flow:
 * 1. Shuffle ideas randomly
 * 2. Idea #1 drops in at an angle
 * 3. Idea #2 drops in on top of Idea #1
 * 4. Idea #3 drops in on top of Idea #2
 * 5. Vote count ticks up exponentially on Idea #3 (top idea)
 * 6. That idea ships through dev cycle (Idea → In Progress → Shipped)
 * 7. Elegant reset with new randomized set
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMediaQuery, breakpoints } from '../../../hooks/useMediaQuery';
import type { PublicIdea, DevCycleStage } from '../../../types/ideas';

export type AnimationPhase =
  | 'stacking'           // Drop in ideas one at a time
  | 'accumulating-votes' // Vote count ticks up on top idea
  | 'dev-cycle'          // Ship the top idea
  | 'resetting';         // Fade out before next cycle

interface AnimationState {
  animationPhase: AnimationPhase;
  stackCount: number;            // How many ideas are currently in the stack (0-3)
  devCycleStage: DevCycleStage;
  isUpvoting: boolean;
  voteAccumulationCount: number; // Current animated vote count
  targetVotes: number;           // Random odd number < 500
  cycleKey: number;              // Increments each cycle to trigger re-shuffle
}

interface UseIdeasAnimationReturn {
  /** The 3 ideas currently in the stack (shuffled) */
  stackedIdeas: PublicIdea[];
  /** How many ideas are visible in the stack (0-3 during stacking phase) */
  visibleStackCount: number;
  /** The top idea (will receive votes and ship) */
  featuredIdea: PublicIdea | null;
  animationPhase: AnimationPhase;
  devCycleStage: DevCycleStage;
  isUpvoting: boolean;
  voteAccumulationCount: number;
  isPaused: boolean;
  prefersReducedMotion: boolean;
  pause: () => void;
  resume: () => void;
}

const FAKE_USERNAMES = [
  'BudgetPro',
  'MonarchFan',
  'SavvySaver',
  'FinanceNinja',
  'PennyPincher',
  'CashFlowKing',
  'FrugalFiona',
  'WealthBuilder',
  'SmartSpender',
  'GoalGetter',
];

// Animation configuration
const STACK_SIZE = 3;               // Always show 3 stacked ideas
const DROP_IN_DELAY = 800;          // Time between each idea dropping in
const VOTE_ANIMATION_DURATION = 3000; // Total time for vote count animation (ms)
const VOTE_FRAME_INTERVAL = 16;     // ~60fps for smooth counting
const RESET_FADE_DURATION = 600;    // Fade out duration before reset
const SHIPPED_DISPLAY_DURATION = 10000; // How long to show shipped state before reset (10 seconds)
const IN_PROGRESS_DURATION = 2500;  // How long the in-progress phase lasts

/** Generate a random odd number between min and max (inclusive) */
function getRandomOddNumber(min: number, max: number): number {
  const oddMin = min % 2 === 0 ? min + 1 : min;
  const oddMax = max % 2 === 0 ? max - 1 : max;
  const range = Math.floor((oddMax - oddMin) / 2) + 1;
  return oddMin + Math.floor(Math.random() * range) * 2;
}

/** Ease-in quadratic - starts slow, speeds up */
function easeInQuad(t: number): number {
  return t * t;
}

/** Fisher-Yates shuffle */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

/** Get a deterministic username based on idea ID */
export function getUsernameForIdea(ideaId: string): string {
  const hash = ideaId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FAKE_USERNAMES[hash % FAKE_USERNAMES.length] ?? 'BudgetFan';
}

/** Get a deterministic avatar seed for generating consistent avatars */
export function getAvatarSeedForIdea(ideaId: string): number {
  return ideaId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export function useIdeasAnimation(ideas: PublicIdea[]): UseIdeasAnimationReturn {
  const prefersReducedMotion = useMediaQuery(breakpoints.prefersReducedMotion);
  const [isPaused, setIsPaused] = useState(false);
  const [state, setState] = useState<AnimationState>({
    animationPhase: 'stacking',
    stackCount: 0,
    devCycleStage: 'idea',
    isUpvoting: false,
    voteAccumulationCount: 0,
    targetVotes: 0,
    cycleKey: 0,
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voteAnimationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voteStartTimeRef = useRef<number>(0);

  const openIdeas = useMemo(
    () => ideas.filter((idea) => idea.status === 'open'),
    [ideas]
  );

  // Shuffle ideas when cycleKey changes
  const shuffledIdeas = useMemo(() => {
    if (openIdeas.length === 0) return [];
    return shuffleArray(openIdeas);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-shuffle on cycleKey change
  }, [openIdeas, state.cycleKey]);

  // Get the 3 ideas for the current stack
  const stackedIdeas = useMemo(() => {
    return shuffledIdeas.slice(0, STACK_SIZE);
  }, [shuffledIdeas]);

  // The top idea (index 2) is the featured one that gets votes and ships
  const featuredIdea = stackedIdeas.length >= STACK_SIZE ? (stackedIdeas[STACK_SIZE - 1] ?? null) : null;

  // Only clear timeouts, not the vote animation interval
  const clearCurrentTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Separate cleanup for vote animation
  const clearVoteAnimation = useCallback(() => {
    if (voteAnimationRef.current) {
      clearInterval(voteAnimationRef.current);
      voteAnimationRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(
    (delay: number, callback: () => void) => {
      clearCurrentTimeout();
      if (!isPaused && !prefersReducedMotion) {
        timeoutRef.current = setTimeout(callback, delay);
      }
    },
    [isPaused, prefersReducedMotion, clearCurrentTimeout]
  );

  // Main animation loop
  useEffect(() => {
    if (stackedIdeas.length < STACK_SIZE || isPaused || prefersReducedMotion) {
      return;
    }

    const { animationPhase, stackCount, devCycleStage, voteAccumulationCount, targetVotes } = state;

    // Phase 1: Stack ideas one at a time
    if (animationPhase === 'stacking') {
      if (stackCount < STACK_SIZE) {
        // Drop in the next idea
        scheduleNext(DROP_IN_DELAY, () => {
          setState((s) => ({
            ...s,
            stackCount: s.stackCount + 1,
          }));
        });
      } else {
        // All 3 stacked, start vote accumulation on the top idea
        const newTargetVotes = getRandomOddNumber(100, 499);
        scheduleNext(500, () => {
          setState((s) => ({
            ...s,
            animationPhase: 'accumulating-votes',
            targetVotes: newTargetVotes,
            voteAccumulationCount: 0,
            isUpvoting: true,
          }));
        });
      }
    }

    // Phase 2: Vote count ticks up exponentially on top idea
    if (animationPhase === 'accumulating-votes') {
      if (targetVotes > 0 && voteAccumulationCount === 0 && !voteAnimationRef.current) {
        const animationTarget = targetVotes;
        voteStartTimeRef.current = Date.now();
        voteAnimationRef.current = setInterval(() => {
          const elapsed = Date.now() - voteStartTimeRef.current;
          const progress = Math.min(elapsed / VOTE_ANIMATION_DURATION, 1);
          const easedProgress = easeInQuad(progress);
          const currentVotes = Math.floor(easedProgress * animationTarget);

          setState((s) => ({
            ...s,
            voteAccumulationCount: currentVotes,
            isUpvoting: progress < 1,
          }));

          if (progress >= 1) {
            clearInterval(voteAnimationRef.current!);
            voteAnimationRef.current = null;
            // Transition to dev cycle
            timeoutRef.current = setTimeout(() => {
              setState((s) => ({
                ...s,
                animationPhase: 'dev-cycle',
                devCycleStage: 'idea',
                isUpvoting: false,
              }));
            }, 600);
          }
        }, VOTE_FRAME_INTERVAL);
      }
    }

    // Phase 3: Dev cycle (In Progress → Shipped) - skip 'idea' stage
    if (animationPhase === 'dev-cycle') {
      if (devCycleStage === 'idea') {
        // Immediately transition to in-progress (skip idea stage)
        setState((s) => ({ ...s, devCycleStage: 'in-progress' }));
      } else if (devCycleStage === 'in-progress') {
        scheduleNext(IN_PROGRESS_DURATION, () => {
          setState((s) => ({ ...s, devCycleStage: 'shipped' }));
        });
      } else if (devCycleStage === 'shipped') {
        // Celebrate longer (10 seconds), then start reset
        scheduleNext(SHIPPED_DISPLAY_DURATION, () => {
          setState((s) => ({ ...s, animationPhase: 'resetting' }));
        });
      }
    }

    // Phase 4: Reset - fade out and prepare new cycle
    if (animationPhase === 'resetting') {
      clearVoteAnimation(); // Clean up any lingering vote animation
      scheduleNext(RESET_FADE_DURATION, () => {
        setState((s) => ({
          ...s,
          animationPhase: 'stacking',
          stackCount: 0,
          devCycleStage: 'idea',
          voteAccumulationCount: 0,
          targetVotes: 0,
          cycleKey: s.cycleKey + 1, // Trigger new shuffle
        }));
      });
    }

    return () => {
      clearCurrentTimeout();
      // Only clear vote animation on unmount, not on every re-render
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally exclude voteAccumulationCount to prevent killing the interval
  }, [
    state.animationPhase,
    state.stackCount,
    state.devCycleStage,
    state.targetVotes,
    stackedIdeas.length,
    isPaused,
    prefersReducedMotion,
    scheduleNext,
    clearCurrentTimeout,
    clearVoteAnimation,
  ]);

  const pause = useCallback(() => {
    setIsPaused(true);
    clearCurrentTimeout();
    clearVoteAnimation();
  }, [clearCurrentTimeout, clearVoteAnimation]);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  return {
    stackedIdeas,
    visibleStackCount: state.stackCount,
    featuredIdea,
    animationPhase: state.animationPhase,
    devCycleStage: state.devCycleStage,
    isUpvoting: state.isUpvoting,
    voteAccumulationCount: state.voteAccumulationCount,
    isPaused,
    prefersReducedMotion,
    pause,
    resume,
  };
}
