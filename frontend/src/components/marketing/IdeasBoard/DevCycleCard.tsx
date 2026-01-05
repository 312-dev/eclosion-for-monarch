/**
 * DevCycleCard Component
 *
 * Visualizes the development cycle: Idea → In Progress → Shipped
 * Shows animated transitions between stages with progress bar.
 */

import { useState, useEffect, useRef } from 'react';
import { Lightbulb, Code, Rocket, Check } from 'lucide-react';
import type { PublicIdea, DevCycleStage } from '../../../types/ideas';
import { getUsernameForIdea, getAvatarSeedForIdea } from './useIdeasAnimation';

interface DevCycleCardProps {
  readonly idea: PublicIdea;
  readonly stage: DevCycleStage;
  readonly reducedMotion?: boolean;
}

/** Get a simple avatar using DiceBear API */
function getAvatarUrl(seed: number): string {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}&backgroundColor=f3f4f6`;
}

const STAGE_CONFIG = {
  idea: {
    icon: Lightbulb,
    label: 'New Idea',
    color: 'var(--monarch-orange)',
    bgColor: 'var(--monarch-orange)',
    progress: 33,
  },
  'in-progress': {
    icon: Code,
    label: 'In Progress',
    color: 'var(--monarch-info)',
    bgColor: 'var(--monarch-info)',
    progress: 66,
  },
  shipped: {
    icon: Rocket,
    label: 'Shipped!',
    color: 'var(--monarch-success)',
    bgColor: 'var(--monarch-success)',
    progress: 100,
  },
} as const;

// Animation duration for progress bar (matches IN_PROGRESS_DURATION in useIdeasAnimation)
const PROGRESS_ANIMATION_DURATION = 2500;

/** Variable-speed easing: slow-fast-slow pattern */
function variableSpeedEasing(t: number): number {
  // Custom easing that slows down, speeds up, then slows down again
  // Using a combination of sin waves for organic feel
  const slowStart = Math.sin(t * Math.PI * 0.5) * 0.3;
  const fastMiddle = t * 0.5;
  const slowEnd = Math.sin(t * Math.PI * 0.5) * 0.2;
  return Math.min(1, slowStart + fastMiddle + slowEnd);
}

export function DevCycleCard({ idea, stage, reducedMotion }: DevCycleCardProps) {
  const [animatingStage, setAnimatingStage] = useState<DevCycleStage>(stage);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const progressAnimationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressStartTimeRef = useRef<number>(0);

  const username = getUsernameForIdea(idea.id);
  const avatarSeed = getAvatarSeedForIdea(idea.id);
  const avatarUrl = getAvatarUrl(avatarSeed);

  const config = STAGE_CONFIG[animatingStage];
  const Icon = config.icon;

  // Animate progress bar during in-progress stage
  useEffect(() => {
    if (animatingStage === 'in-progress' && !reducedMotion) {
      progressStartTimeRef.current = Date.now();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync for animation reset
      setAnimatedProgress(0);

      progressAnimationRef.current = setInterval(() => {
        const elapsed = Date.now() - progressStartTimeRef.current;
        const linearProgress = Math.min(elapsed / PROGRESS_ANIMATION_DURATION, 1);
        const easedProgress = variableSpeedEasing(linearProgress);

        setAnimatedProgress(Math.floor(easedProgress * 100));

        if (linearProgress >= 1) {
          if (progressAnimationRef.current) {
            clearInterval(progressAnimationRef.current);
            progressAnimationRef.current = null;
          }
        }
      }, 16); // ~60fps

      return () => {
        if (progressAnimationRef.current) {
          clearInterval(progressAnimationRef.current);
          progressAnimationRef.current = null;
        }
      };
    } else if (animatingStage === 'shipped') {
      setAnimatedProgress(100);
    }
  }, [animatingStage, reducedMotion]);

  // Get display progress based on stage
  const displayProgress = animatingStage === 'in-progress'
    ? animatedProgress
    : animatingStage === 'shipped'
      ? 100
      : 0;

  // Handle stage transitions - intentional sync for animation state
  useEffect(() => {
    if (stage !== animatingStage) {
      if (reducedMotion) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync for reduced motion
        setAnimatingStage(stage);
        return;
      }

      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setAnimatingStage(stage);
        setIsTransitioning(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [stage, animatingStage, reducedMotion]);

  const cardAnimationClass = reducedMotion
    ? ''
    : animatingStage === 'shipped'
      ? 'ship-celebrate'
      : '';

  const contentAnimationClass = reducedMotion
    ? ''
    : isTransitioning
      ? 'stage-slide-out'
      : 'stage-slide-in';

  return (
    <div
      className={`relative rounded-xl border-2 bg-[var(--monarch-bg-card)] p-4 shadow-lg transition-colors duration-300 ${cardAnimationClass}`}
      style={{ borderColor: config.bgColor }}
      role="article"
      aria-label={`Development cycle: ${config.label}`}
      aria-live="polite"
    >
      {/* Stage badge */}
      <div
        className={`absolute -top-3 left-4 px-3 py-1 rounded-full text-xs font-semibold text-white shadow-md ${contentAnimationClass}`}
        style={{ backgroundColor: config.bgColor }}
      >
        <span className="flex items-center gap-1.5">
          <Icon className="h-3 w-3" />
          {config.label}
        </span>
      </div>

      {/* User info */}
      <div className={`flex items-center gap-3 mt-3 mb-3 ${contentAnimationClass}`}>
        <img
          src={avatarUrl}
          alt=""
          className="h-8 w-8 rounded-full bg-[var(--monarch-bg-page)]"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-[var(--monarch-text-dark)]">{username}</span>
      </div>

      {/* Idea content */}
      <h3
        className={`text-sm font-medium text-[var(--monarch-text-dark)] leading-snug mb-3 line-clamp-2 ${contentAnimationClass}`}
      >
        {idea.title}
      </h3>

      {/* Progress bar - animated during in-progress, static otherwise */}
      <div className="h-2 rounded-full bg-[var(--monarch-bg-page)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            backgroundColor: config.bgColor,
            width: `${displayProgress}%`,
            transition: animatingStage === 'shipped' ? 'width 300ms ease-out' : 'none',
          }}
        />
      </div>

      {/* Shipped checkmark */}
      {animatingStage === 'shipped' && (
        <div className={`flex items-center gap-2 mt-3 ${contentAnimationClass}`}>
          <div
            className="flex items-center justify-center h-6 w-6 rounded-full"
            style={{ backgroundColor: config.bgColor }}
          >
            <Check className="h-4 w-4 text-white" />
          </div>
          <span
            className="text-sm font-medium"
            style={{ color: config.color }}
          >
            Feature delivered!
          </span>
        </div>
      )}
    </div>
  );
}
