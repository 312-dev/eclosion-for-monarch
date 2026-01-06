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
  | 'morphing-to-dev'    // Smooth transition from voting card to dev card
  | 'dev-cycle'          // Ship the top idea
  | 'resetting';         // Fade out before next cycle

/** Developer contributor info */
export interface DeveloperContributor {
  id: number;
  seed: number;
  username: string;
}

interface AnimationState {
  animationPhase: AnimationPhase;
  stackCount: number;            // How many ideas are currently in the stack (0-3)
  devCycleStage: DevCycleStage;
  isUpvoting: boolean;
  voteAccumulationCount: number; // Current animated vote count
  targetVotes: number;           // Random odd number < 500
  cycleKey: number;              // Increments each cycle to trigger re-shuffle
  developers: DeveloperContributor[]; // Developers contributing during in-progress
  devProgress: number;           // Progress 0-100 controlled by developer contributions
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
  /** Developers contributing during in-progress phase (up to 5) */
  developers: DeveloperContributor[];
  /** Progress 0-100, accelerates as more developers join */
  devProgress: number;
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

const DEVELOPER_USERNAMES = [
  'CodeCrafter',
  'BugSquasher',
  'FeatureSmith',
  'DevDynamo',
  'ShipItSam',
  'ReactRocket',
  'TypeScriptTitan',
  'APIArchitect',
  'FullStackFiona',
  'CommitKing',
];

// Animation configuration
const STACK_SIZE = 3;               // Always show 3 stacked ideas
const DROP_IN_DELAY = 1500;         // Time between each idea dropping in (1.5s each)
const DROP_IN_DELAY_INITIAL = 3500; // Extra time for first two ideas (1.5s + 2s)
const POST_RESET_DELAY = 100;       // Minimal delay after reset to restart animation immediately
const VOTE_START_DELAY = 2500;      // Pause before votes start accumulating (2.5s)
const VOTE_ANIMATION_DURATION = 3000; // Total time for vote count animation (ms)
const VOTE_FRAME_INTERVAL = 16;     // ~60fps for smooth counting
const RESET_FADE_DURATION = 600;    // Fade out duration before reset
const SHIPPED_DISPLAY_DURATION = 10000; // How long to show shipped state before reset (10 seconds)
const MORPH_DURATION = 600;         // Duration of morph animation from voting to dev card
const MAX_DEVELOPERS = 5;           // Maximum developers that can contribute
const DEV_APPEAR_INTERVAL_INITIAL = 1200; // Initial interval between developer appearances (slower start)
const DEV_APPEAR_INTERVAL_MIN = 400;      // Minimum interval (faster as more devs join)
const PROGRESS_UPDATE_INTERVAL = 50;      // How often to update progress (ms)

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

/** Generate a random developer contributor */
function generateRandomDeveloper(id: number, usedSeeds: Set<number>): DeveloperContributor {
  let seed: number;
  do {
    seed = Math.floor(Math.random() * 10000);
  } while (usedSeeds.has(seed));
  usedSeeds.add(seed);

  const usernameIndex = Math.floor(Math.random() * DEVELOPER_USERNAMES.length);
  return {
    id,
    seed,
    username: DEVELOPER_USERNAMES[usernameIndex] ?? 'Developer',
  };
}

/** Generate a deterministic hash from a string */
function hashString(str: string): number {
  return str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

/** Get username for an idea - uses real author if available, falls back to synthetic */
export function getUsernameForIdea(idea: PublicIdea): string {
  if (idea.author?.username) {
    return idea.author.username;
  }
  const hash = hashString(idea.id);
  return FAKE_USERNAMES[hash % FAKE_USERNAMES.length] ?? 'BudgetFan';
}

/** Get avatar URL for an idea - uses real author if available, falls back to DiceBear */
export function getAvatarUrlForIdea(idea: PublicIdea): string {
  if (idea.author?.avatarUrl) {
    return idea.author.avatarUrl;
  }
  const seed = hashString(idea.id);
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}&backgroundColor=f3f4f6`;
}

/**
 * @deprecated Use getAvatarUrlForIdea instead
 * Get a deterministic avatar seed for generating consistent avatars
 */
export function getAvatarSeedForIdea(idea: PublicIdea): number {
  return hashString(idea.id);
}

export function useIdeasAnimation(ideas: PublicIdea[]): UseIdeasAnimationReturn {
  const prefersReducedMotion = useMediaQuery(breakpoints.prefersReducedMotion);
  const [isPaused, setIsPaused] = useState(false);
  const [state, setState] = useState<AnimationState>({
    animationPhase: 'stacking',
    stackCount: 1, // Start with one card already visible (no drop-in animation)
    devCycleStage: 'idea',
    isUpvoting: false,
    voteAccumulationCount: 0,
    targetVotes: 0,
    cycleKey: 0,
    developers: [],
    devProgress: 0,
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voteAnimationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voteStartTimeRef = useRef<number>(0);
  const devAnimationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAnimationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usedSeedsRef = useRef<Set<number>>(new Set());

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

  // Cleanup for developer and progress animations
  const clearDevAnimations = useCallback(() => {
    if (devAnimationRef.current) {
      clearTimeout(devAnimationRef.current);
      devAnimationRef.current = null;
    }
    if (progressAnimationRef.current) {
      clearInterval(progressAnimationRef.current);
      progressAnimationRef.current = null;
    }
  }, []);

  // Add a new developer and schedule the next one with accelerating interval
  const scheduleNextDeveloper = useCallback((currentCount: number) => {
    if (currentCount >= MAX_DEVELOPERS || isPaused || prefersReducedMotion) {
      return;
    }

    // Calculate interval - gets faster as more developers join
    const progressRatio = currentCount / MAX_DEVELOPERS;
    const interval = DEV_APPEAR_INTERVAL_INITIAL -
      (DEV_APPEAR_INTERVAL_INITIAL - DEV_APPEAR_INTERVAL_MIN) * progressRatio;

    devAnimationRef.current = setTimeout(() => {
      const newDev = generateRandomDeveloper(currentCount, usedSeedsRef.current);
      setState((s) => ({
        ...s,
        developers: [...s.developers, newDev],
      }));
      scheduleNextDeveloper(currentCount + 1);
    }, interval);
  }, [isPaused, prefersReducedMotion]);

  // Start the progress animation based on developer count
  const startProgressAnimation = useCallback(() => {
    if (progressAnimationRef.current || isPaused || prefersReducedMotion) return;

    const startTime = Date.now();
    // Base duration when 1 dev, faster when more devs
    const getTargetDuration = (devCount: number) => {
      // 1 dev = 12s, 5 devs = 6s (minimum)
      const baseDuration = 12000;
      const minDuration = 6000;
      const speedMultiplier = Math.max(1, devCount);
      return Math.max(minDuration, baseDuration / speedMultiplier);
    };

    progressAnimationRef.current = setInterval(() => {
      setState((s) => {
        const devCount = s.developers.length;
        if (devCount === 0) return s;

        const elapsed = Date.now() - startTime;
        const targetDuration = getTargetDuration(devCount);

        // Use ease-in curve for accelerating feel
        const rawProgress = Math.min(elapsed / targetDuration, 1);
        const easedProgress = easeInQuad(rawProgress);
        const newProgress = Math.min(Math.floor(easedProgress * 100), 100);

        if (newProgress >= 100) {
          clearInterval(progressAnimationRef.current!);
          progressAnimationRef.current = null;
          // Transition to shipped
          return {
            ...s,
            devProgress: 100,
            devCycleStage: 'shipped',
          };
        }

        return { ...s, devProgress: newProgress };
      });
    }, PROGRESS_UPDATE_INTERVAL);
  }, [isPaused, prefersReducedMotion]);

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
        // After reset (cycleKey > 0), start immediately; otherwise use initial delay for first two
        const isPostReset = state.cycleKey > 0;
        let delay = DROP_IN_DELAY;
        if (isPostReset && stackCount === 0) {
          delay = POST_RESET_DELAY;
        } else if (stackCount < 2) {
          delay = DROP_IN_DELAY_INITIAL;
        }
        scheduleNext(delay, () => {
          setState((s) => ({
            ...s,
            stackCount: s.stackCount + 1,
          }));
        });
      } else {
        // All 3 stacked, start vote accumulation on the top idea
        const newTargetVotes = getRandomOddNumber(100, 499);
        scheduleNext(VOTE_START_DELAY, () => {
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
            // Transition to morphing phase (smooth transition to dev card)
            timeoutRef.current = setTimeout(() => {
              setState((s) => ({
                ...s,
                animationPhase: 'morphing-to-dev',
                isUpvoting: false,
              }));
            }, 400);
          }
        }, VOTE_FRAME_INTERVAL);
      }
    }

    // Phase 2.5: Morphing from voting card to dev card
    if (animationPhase === 'morphing-to-dev') {
      // After morph animation completes, start dev cycle with in-progress
      scheduleNext(MORPH_DURATION, () => {
        usedSeedsRef.current.clear(); // Reset used seeds for new developers
        setState((s) => ({
          ...s,
          animationPhase: 'dev-cycle',
          devCycleStage: 'in-progress',
          developers: [],
          devProgress: 0,
        }));
      });
    }

    // Phase 3: Dev cycle - developers join and progress accelerates
    if (animationPhase === 'dev-cycle') {
      if (devCycleStage === 'in-progress') {
        // Start adding developers if we haven't yet
        if (state.developers.length === 0 && !devAnimationRef.current) {
          // Add first developer immediately
          const firstDev = generateRandomDeveloper(0, usedSeedsRef.current);
          setState((s) => ({ ...s, developers: [firstDev] }));
          // Schedule subsequent developers
          scheduleNextDeveloper(1);
          // Start progress animation
          startProgressAnimation();
        }
      } else if (devCycleStage === 'shipped') {
        // Clean up dev animations
        clearDevAnimations();
        // Celebrate longer (10 seconds), then start reset
        scheduleNext(SHIPPED_DISPLAY_DURATION, () => {
          setState((s) => ({ ...s, animationPhase: 'resetting' }));
        });
      }
    }

    // Phase 4: Reset - fade out and prepare new cycle
    if (animationPhase === 'resetting') {
      clearVoteAnimation();
      clearDevAnimations();
      scheduleNext(RESET_FADE_DURATION, () => {
        usedSeedsRef.current.clear();
        setState((s) => ({
          ...s,
          animationPhase: 'stacking',
          stackCount: 1, // Start with one card already visible (randomized via cycleKey shuffle)
          devCycleStage: 'idea',
          voteAccumulationCount: 0,
          targetVotes: 0,
          developers: [],
          devProgress: 0,
          cycleKey: s.cycleKey + 1, // Trigger new shuffle
        }));
      });
    }

    return () => {
      clearCurrentTimeout();
      // Only clear vote animation on unmount, not on every re-render
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally exclude voteAccumulationCount and developers.length to prevent killing intervals
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
    clearDevAnimations,
    scheduleNextDeveloper,
    startProgressAnimation,
  ]);

  const pause = useCallback(() => {
    setIsPaused(true);
    clearCurrentTimeout();
    clearVoteAnimation();
    clearDevAnimations();
  }, [clearCurrentTimeout, clearVoteAnimation, clearDevAnimations]);

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
    developers: state.developers,
    devProgress: state.devProgress,
    isPaused,
    prefersReducedMotion,
    pause,
    resume,
  };
}
