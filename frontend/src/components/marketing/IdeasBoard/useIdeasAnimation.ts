/* eslint-disable max-lines -- Complex animation state machine for landing page demo */
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
import {
  type DeveloperContributor,
  ANIMATION_CONFIG,
  getRandomOddNumber,
  easeInQuad,
  shuffleArray,
  generateRandomDeveloper,
} from './ideasAnimationUtils';

// Re-export for external use

export type AnimationPhase =
  | 'stacking' // Drop in ideas one at a time
  | 'accumulating-votes' // Vote count ticks up on top idea
  | 'morphing-to-dev' // Smooth transition from voting card to dev card
  | 'dev-cycle' // Ship the top idea
  | 'resetting'; // Fade out before next cycle

interface AnimationState {
  animationPhase: AnimationPhase;
  stackCount: number;
  devCycleStage: DevCycleStage;
  isUpvoting: boolean;
  voteAccumulationCount: number;
  targetVotes: number;
  cycleKey: number;
  developers: DeveloperContributor[];
  devProgress: number;
}

interface UseIdeasAnimationReturn {
  stackedIdeas: PublicIdea[];
  visibleStackCount: number;
  featuredIdea: PublicIdea | null;
  animationPhase: AnimationPhase;
  devCycleStage: DevCycleStage;
  isUpvoting: boolean;
  voteAccumulationCount: number;
  developers: DeveloperContributor[];
  devProgress: number;
  isPaused: boolean;
  prefersReducedMotion: boolean;
  pause: () => void;
  resume: () => void;
}

const {
  STACK_SIZE,
  DROP_IN_DELAY,
  DROP_IN_DELAY_INITIAL,
  VOTE_START_DELAY,
  VOTE_ANIMATION_DURATION,
  VOTE_FRAME_INTERVAL,
  RESET_FADE_DURATION,
  SHIPPED_DISPLAY_DURATION,
  MORPH_DURATION,
  MAX_DEVELOPERS,
  DEV_APPEAR_INTERVAL_INITIAL,
  DEV_APPEAR_INTERVAL_MIN,
  PROGRESS_UPDATE_INTERVAL,
} = ANIMATION_CONFIG;

export function useIdeasAnimation(ideas: PublicIdea[]): UseIdeasAnimationReturn {
  const prefersReducedMotion = useMediaQuery(breakpoints.prefersReducedMotion);
  const [isPaused, setIsPaused] = useState(false);
  const [state, setState] = useState<AnimationState>({
    animationPhase: 'stacking',
    stackCount: 1,
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

  const openIdeas = useMemo(() => ideas.filter((idea) => idea.status === 'open'), [ideas]);

  const shuffledIdeas = useMemo(() => {
    if (openIdeas.length === 0) return [];
    return shuffleArray(openIdeas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIdeas, state.cycleKey]);

  const stackedIdeas = useMemo(() => shuffledIdeas.slice(0, STACK_SIZE), [shuffledIdeas]);
  const featuredIdea =
    stackedIdeas.length >= STACK_SIZE ? (stackedIdeas[STACK_SIZE - 1] ?? null) : null;

  const clearCurrentTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clearVoteAnimation = useCallback(() => {
    if (voteAnimationRef.current) {
      clearInterval(voteAnimationRef.current);
      voteAnimationRef.current = null;
    }
  }, []);

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

  const scheduleNextDeveloper = useCallback(
    (currentCount: number) => {
      if (currentCount >= MAX_DEVELOPERS || isPaused || prefersReducedMotion) return;
      const progressRatio = currentCount / MAX_DEVELOPERS;
      const interval =
        DEV_APPEAR_INTERVAL_INITIAL -
        (DEV_APPEAR_INTERVAL_INITIAL - DEV_APPEAR_INTERVAL_MIN) * progressRatio;

      devAnimationRef.current = setTimeout(() => {
        const newDev = generateRandomDeveloper(currentCount, usedSeedsRef.current);
        setState((s) => ({ ...s, developers: [...s.developers, newDev] }));
        scheduleNextDeveloper(currentCount + 1);
      }, interval);
    },
    [isPaused, prefersReducedMotion]
  );

  const startProgressAnimation = useCallback(() => {
    if (progressAnimationRef.current || isPaused || prefersReducedMotion) return;

    const startTime = Date.now();
    const getTargetDuration = (devCount: number) => {
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
        const rawProgress = Math.min(elapsed / targetDuration, 1);
        const easedProgress = easeInQuad(rawProgress);
        const newProgress = Math.min(Math.floor(easedProgress * 100), 100);

        if (newProgress >= 100) {
          clearInterval(progressAnimationRef.current!);
          progressAnimationRef.current = null;
          return { ...s, devProgress: 100, devCycleStage: 'shipped' as DevCycleStage };
        }
        return { ...s, devProgress: newProgress };
      });
    }, PROGRESS_UPDATE_INTERVAL);
  }, [isPaused, prefersReducedMotion]);

  // Main animation loop
  // eslint-disable-next-line sonarjs/cognitive-complexity -- Animation state machine with multiple phases (stacking, voting, morphing, dev cycle)
  useEffect(() => {
    if (stackedIdeas.length < STACK_SIZE || isPaused || prefersReducedMotion) return;

    const { animationPhase, stackCount, devCycleStage } = state;

    if (animationPhase === 'stacking') {
      if (stackCount < STACK_SIZE) {
        const delay = stackCount === 1 ? DROP_IN_DELAY_INITIAL : DROP_IN_DELAY;
        timeoutRef.current = setTimeout(() => {
          setState((s) => ({ ...s, stackCount: s.stackCount + 1 }));
        }, delay);
      } else {
        const targetVotes = getRandomOddNumber(51, 499);
        timeoutRef.current = setTimeout(() => {
          setState((s) => ({
            ...s,
            animationPhase: 'accumulating-votes',
            targetVotes,
            isUpvoting: true,
          }));
        }, VOTE_START_DELAY);
      }
    } else if (animationPhase === 'accumulating-votes') {
      if (!voteAnimationRef.current) {
        voteStartTimeRef.current = Date.now();
        voteAnimationRef.current = setInterval(() => {
          const elapsed = Date.now() - voteStartTimeRef.current;
          const rawProgress = Math.min(elapsed / VOTE_ANIMATION_DURATION, 1);
          const easedProgress = easeInQuad(rawProgress);

          setState((s) => {
            const newCount = Math.floor(easedProgress * s.targetVotes);
            if (rawProgress >= 1) {
              clearInterval(voteAnimationRef.current!);
              voteAnimationRef.current = null;
              return {
                ...s,
                voteAccumulationCount: s.targetVotes,
                isUpvoting: false,
                animationPhase: 'morphing-to-dev',
              };
            }
            return { ...s, voteAccumulationCount: newCount };
          });
        }, VOTE_FRAME_INTERVAL);
      }
    } else if (animationPhase === 'morphing-to-dev') {
      timeoutRef.current = setTimeout(() => {
        setState((s) => ({ ...s, animationPhase: 'dev-cycle', devCycleStage: 'in-progress' }));
      }, MORPH_DURATION);
    } else if (animationPhase === 'dev-cycle') {
      if (devCycleStage === 'in-progress') {
        usedSeedsRef.current.clear();
        const initialDev = generateRandomDeveloper(0, usedSeedsRef.current);
        setState((s) => ({ ...s, developers: [initialDev] }));
        scheduleNextDeveloper(1);
        startProgressAnimation();
      } else if (devCycleStage === 'shipped') {
        clearDevAnimations();
        timeoutRef.current = setTimeout(() => {
          setState((s) => ({ ...s, animationPhase: 'resetting' }));
        }, SHIPPED_DISPLAY_DURATION);
      }
    } else if (animationPhase === 'resetting') {
      timeoutRef.current = setTimeout(() => {
        setState((s) => ({
          animationPhase: 'stacking',
          stackCount: 1,
          devCycleStage: 'idea',
          isUpvoting: false,
          voteAccumulationCount: 0,
          targetVotes: 0,
          cycleKey: s.cycleKey + 1,
          developers: [],
          devProgress: 0,
        }));
      }, RESET_FADE_DURATION);
    }

    return () => {
      clearCurrentTimeout();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally depend on specific state properties only
  }, [
    state.animationPhase,
    state.stackCount,
    state.devCycleStage,
    stackedIdeas.length,
    isPaused,
    prefersReducedMotion,
    clearCurrentTimeout,
    scheduleNextDeveloper,
    startProgressAnimation,
    clearDevAnimations,
  ]);

  // Resume after pause
  useEffect(() => {
    if (
      !isPaused &&
      state.animationPhase === 'dev-cycle' &&
      state.devCycleStage === 'in-progress'
    ) {
      if (!progressAnimationRef.current) startProgressAnimation();
      if (!devAnimationRef.current && state.developers.length < MAX_DEVELOPERS) {
        scheduleNextDeveloper(state.developers.length);
      }
    }
  }, [
    isPaused,
    state.animationPhase,
    state.devCycleStage,
    state.developers.length,
    scheduleNextDeveloper,
    startProgressAnimation,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCurrentTimeout();
      clearVoteAnimation();
      clearDevAnimations();
    };
  }, [clearCurrentTimeout, clearVoteAnimation, clearDevAnimations]);

  // Reduced motion: skip to end
  useEffect(() => {
    if (
      prefersReducedMotion &&
      stackedIdeas.length >= STACK_SIZE &&
      state.animationPhase === 'stacking'
    ) {
      setState((s) => ({
        ...s,
        stackCount: STACK_SIZE,
        animationPhase: 'dev-cycle',
        devCycleStage: 'shipped',
        devProgress: 100,
      }));
    }
  }, [prefersReducedMotion, stackedIdeas.length, state.animationPhase]);

  const pause = useCallback(() => {
    setIsPaused(true);
    clearCurrentTimeout();
    clearDevAnimations();
  }, [clearCurrentTimeout, clearDevAnimations]);

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

export {
  getUsernameForIdea,
  getAvatarUrlForIdea,
  type DeveloperContributor,
} from './ideasAnimationUtils';
