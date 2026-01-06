/**
 * DevCycleCard Component
 *
 * Visualizes the development cycle: Idea → In Progress → Shipped
 * Shows animated transitions between stages with progress bar.
 * During in-progress, shows developer avatars joining and accelerating progress.
 */

import { useState, useEffect } from 'react';
import { Lightbulb, Code, Rocket, Check } from 'lucide-react';
import type { PublicIdea, DevCycleStage } from '../../../types/ideas';
import { getUsernameForIdea, getAvatarUrlForIdea } from './useIdeasAnimation';
import type { DeveloperContributor } from './useIdeasAnimation';
import { IdeatorAvatar } from '../../ui/IdeatorAvatar';

interface DevCycleCardProps {
  readonly idea: PublicIdea;
  readonly stage: DevCycleStage;
  readonly reducedMotion?: boolean;
  /** Developers contributing during in-progress phase */
  readonly developers?: DeveloperContributor[];
  /** Progress 0-100, controlled by parent based on developer count */
  readonly devProgress?: number;
}

/** Get a simple avatar using DiceBear API (for developer contributors) */
function getDeveloperAvatarUrl(seed: number): string {
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

export function DevCycleCard({ idea, stage, reducedMotion, developers = [], devProgress = 0 }: DevCycleCardProps) {
  const [animatingStage, setAnimatingStage] = useState<DevCycleStage>(stage);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const username = getUsernameForIdea(idea);
  const avatarUrl = getAvatarUrlForIdea(idea);

  const config = STAGE_CONFIG[animatingStage];
  const Icon = config.icon;

  // Get display progress - use devProgress for in-progress, 100 for shipped
  const displayProgress = animatingStage === 'shipped' ? 100 : devProgress;

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
      className={`relative rounded-xl border-2 bg-[var(--monarch-bg-elevated)] p-4 shadow-lg transition-colors duration-300 ${cardAnimationClass}`}
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

      {/* Demo disclaimer */}
      <span className="absolute -top-2 right-3 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--monarch-bg-page)] text-[var(--monarch-text-muted)] border border-[var(--monarch-border)]">
        Demo
      </span>

      {/* User info */}
      <div className={`flex items-center gap-3 mt-3 mb-3 ${contentAnimationClass}`}>
        <IdeatorAvatar avatarUrl={avatarUrl} username={username} size="md" />
        <span className="text-sm font-medium text-[var(--monarch-text-dark)]">{username}</span>
      </div>

      {/* Idea content */}
      <h3
        className={`text-sm font-medium text-[var(--monarch-text-dark)] leading-snug mb-3 line-clamp-2 ${contentAnimationClass}`}
      >
        {idea.title}
      </h3>

      {/* Developers row - shows during in-progress */}
      {animatingStage === 'in-progress' && developers.length > 0 && (
        <div className={`mb-3 ${contentAnimationClass}`}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--monarch-text-muted)]">Developers</span>
            <div className="flex -space-x-2">
              {developers.map((dev, index) => (
                <img
                  key={dev.id}
                  src={getDeveloperAvatarUrl(dev.seed)}
                  alt={dev.username}
                  title={dev.username}
                  className="h-6 w-6 rounded-full border-2 border-[var(--monarch-bg-card)] bg-[var(--monarch-bg-page)] dev-avatar-pop-in"
                  style={{
                    animationDelay: reducedMotion ? '0ms' : `${index * 50}ms`,
                    zIndex: developers.length - index,
                  }}
                />
              ))}
            </div>
            {developers.length > 0 && (
              <span className="text-xs text-[var(--monarch-text-muted)] ml-1">
                {developers.length === 1 ? '1 contributor' : `${developers.length} contributors`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress bar - smooth transition based on devProgress */}
      <div className="h-2 rounded-full bg-[var(--monarch-bg-page)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-100 ease-out"
          style={{
            backgroundColor: config.bgColor,
            width: `${displayProgress}%`,
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
