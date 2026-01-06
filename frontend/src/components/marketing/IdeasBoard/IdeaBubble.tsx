/**
 * IdeaBubble Component
 *
 * Displays a single community idea with a fake user avatar and username.
 * Supports stacking effect with rotation and offset positioning.
 * Handles full dev cycle animation in place (idea → in-progress → shipped).
 */

import { useState, useEffect, useRef } from 'react';
import { ThumbsUp, Code, Rocket, Check } from 'lucide-react';
import type { PublicIdea, DevCycleStage } from '../../../types/ideas';
import { getUsernameForIdea, getAvatarUrlForIdea } from './useIdeasAnimation';
import type { DeveloperContributor } from './useIdeasAnimation';
import { IdeatorAvatar } from '../../ui/IdeatorAvatar';

/** Get a simple avatar using DiceBear API (for developer contributors) */
function getDeveloperAvatarUrl(seed: number): string {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}&backgroundColor=f3f4f6`;
}

interface IdeaBubbleProps {
  readonly idea: PublicIdea;
  readonly isUpvoting: boolean;
  readonly voteBonus?: number;        // Additional votes to show (for accumulation animation)
  readonly isExiting?: boolean;
  readonly reducedMotion?: boolean;
  readonly stackPosition?: number;    // Position in stack (0 = bottom, higher = top)
  readonly isStacked?: boolean;       // Whether this is part of a stack
  readonly isFeatured?: boolean;      // The featured idea (lands level)
  readonly isTopCard?: boolean;       // Whether this is the top card (shows shadow)
  readonly isMorphingToDev?: boolean; // Morphing into dev cycle card with pop animation
  readonly isMorphingOut?: boolean;   // Fading out during morph transition
  // Dev cycle props - when set, card transforms in place
  readonly devCycleStage?: DevCycleStage;
  readonly developers?: DeveloperContributor[];
  readonly devProgress?: number;
}

/** Get rotation angle for stacked cards - dramatic angles for visual impact */
function getStackRotation(position: number, ideaId: string): number {
  // Use idea ID to make rotation deterministic but varied
  const hash = ideaId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // Base angle adds some randomness based on idea hash (-3 to +3)
  const hashOffset = ((hash % 6) - 3);
  // Each position gets a distinct, dramatic rotation
  // Position 0 (bottom): tilted left, Position 1: tilted right, Position 2 (top): slight tilt
  const positionAngle = position === 0 ? -8 : position === 1 ? 6 : -2;
  return positionAngle + hashOffset;
}

/** Get offset for stacked cards - no y offset, cards stack directly */
function getStackOffset(position: number, ideaId: string): { x: number; y: number } {
  const hash = ideaId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // Horizontal scatter based on hash + position
  const xBase = ((hash % 20) - 10);
  const xPosition = position === 0 ? -6 : position === 1 ? 4 : 0;
  return {
    x: xBase + xPosition,
    y: 0, // No y offset - cards stack directly on top
  };
}

/** Get animation class for stacked cards - alternates left/right based on position */
function getAnimationClass(
  stackPosition: number,
  isExiting: boolean,
  reducedMotion: boolean,
  isMorphingToDev: boolean,
  isMorphingOut: boolean,
  isInDevCycle: boolean
): string {
  if (reducedMotion) return '';
  if (isMorphingToDev) return 'idea-morph-to-dev';
  if (isMorphingOut) return 'idea-morph-out';
  if (isExiting) return 'idea-pop-out';
  // No entry animation for dev cycle cards - they're already on screen from morphing
  if (isInDevCycle) return '';
  // Even positions enter from left, odd from right
  return stackPosition % 2 === 0 ? 'idea-pop-in-left' : 'idea-pop-in-right';
}

export function IdeaBubble({
  idea,
  isUpvoting: _isUpvoting,
  voteBonus = 0,
  isExiting,
  reducedMotion,
  stackPosition = 0,
  isStacked = false,
  isFeatured = false,
  isTopCard = false,
  isMorphingToDev = false,
  isMorphingOut = false,
  devCycleStage,
  developers = [],
  devProgress = 0,
}: IdeaBubbleProps) {
  // _isUpvoting available for future use (continuous animation state)
  const [displayedVotes, setDisplayedVotes] = useState(idea.votes);
  const [showVoteAnimation, setShowVoteAnimation] = useState(false);
  const [lastVoteBonus, setLastVoteBonus] = useState(voteBonus);
  const [wasStackedOn, setWasStackedOn] = useState(false);
  const wasTopCardRef = useRef(isTopCard);

  const username = getUsernameForIdea(idea);
  const avatarUrl = getAvatarUrlForIdea(idea);

  // Detect when card transitions from top to stacked-on
  useEffect(() => {
    if (wasTopCardRef.current && !isTopCard && !reducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- detecting animation state transition
      setWasStackedOn(true);
    }
    wasTopCardRef.current = isTopCard;
  }, [isTopCard, reducedMotion]);

  // Handle vote accumulation animation
  useEffect(() => {
    if (voteBonus > lastVoteBonus && !reducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync for animation trigger
      setShowVoteAnimation(true);
      setDisplayedVotes(idea.votes + voteBonus);
      setLastVoteBonus(voteBonus);
      const timer = setTimeout(() => setShowVoteAnimation(false), 300);
      return () => clearTimeout(timer);
    }
  }, [voteBonus, lastVoteBonus, idea.votes, reducedMotion]);

  // Reset votes when idea changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync for prop changes
    setDisplayedVotes(idea.votes + voteBonus);
    setLastVoteBonus(voteBonus);
  }, [idea.id, idea.votes, voteBonus]);

  // Dev cycle state determines border color and appearance
  const isInDevCycle = !!devCycleStage;
  const isInProgress = devCycleStage === 'in-progress';
  const isShipped = devCycleStage === 'shipped';

  // Calculate stack transforms
  const rotation = isStacked && !isFeatured ? getStackRotation(stackPosition, idea.id) : 0;
  const offset = isStacked && !isFeatured ? getStackOffset(stackPosition, idea.id) : { x: 0, y: 0 };

  const animationClass = getAnimationClass(stackPosition, !!isExiting, !!reducedMotion, isMorphingToDev, isMorphingOut, isInDevCycle);

  const stackStyle = {
    transform: `rotate(${rotation}deg) translate(${offset.x}px, ${offset.y}px)`,
    zIndex: stackPosition + 1,
    transition: isFeatured ? 'transform 0.4s ease-out' : undefined,
  };

  // Top card gets a more prominent shadow to emphasize it landing on the stack
  const shadowClass = isTopCard || !isStacked ? 'shadow-xl' : 'shadow-sm';
  const stackedOnClass = wasStackedOn ? 'idea-stacked-on' : '';

  // Border styling based on state
  const getBorderStyle = () => {
    if (isShipped) return { borderColor: 'var(--monarch-success)', borderWidth: '2px' };
    if (isInProgress || isMorphingToDev) return { borderColor: 'var(--monarch-info)', borderWidth: '2px' };
    return {};
  };

  // Get stage badge config
  const getStageBadge = () => {
    if (isShipped) return { icon: Rocket, label: 'Shipped!', color: 'var(--monarch-success)' };
    if (isInProgress || isMorphingToDev) return { icon: Code, label: 'In Progress', color: 'var(--monarch-info)' };
    return null;
  };

  const stageBadge = getStageBadge();
  const showDevFeatures = isInDevCycle || isMorphingToDev;

  return (
    <div
      className={`rounded-xl border bg-[var(--monarch-bg-elevated)] p-4 ${shadowClass} ${animationClass} ${stackedOnClass} ${isStacked && !isInDevCycle ? 'absolute left-0 right-0 top-0' : 'relative'} transition-all duration-300`}
      style={{
        ...(isStacked && !isInDevCycle ? stackStyle : {}),
        ...getBorderStyle(),
        borderColor: getBorderStyle().borderColor || 'var(--monarch-text-muted)',
        borderWidth: getBorderStyle().borderWidth || '1px',
        opacity: getBorderStyle().borderWidth ? 1 : 0.2,
      }}
      role="article"
      aria-label={`Idea from ${username}: ${idea.title}`}
    >
      {/* Stage badge - appears for dev cycle states */}
      {stageBadge && (
        <div
          className={`absolute -top-3 left-4 px-3 py-1 rounded-full text-xs font-semibold text-white shadow-md ${isMorphingToDev ? 'morph-element-in' : ''}`}
          style={{ backgroundColor: stageBadge.color }}
        >
          <span className="flex items-center gap-1.5">
            <stageBadge.icon className="h-3 w-3" />
            {stageBadge.label}
          </span>
        </div>
      )}

      {/* Demo badge - appears during dev cycle */}
      {showDevFeatures && (
        <span className={`absolute -top-2 right-3 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--monarch-bg-page)] text-[var(--monarch-text-muted)] border border-[var(--monarch-border)] ${isMorphingToDev ? 'morph-element-in' : ''}`}>
          Demo
        </span>
      )}

      {/* User info */}
      <div className={`flex items-center gap-3 mb-3 ${showDevFeatures ? 'mt-3' : ''}`}>
        <IdeatorAvatar avatarUrl={avatarUrl} username={username} size="md" />
        <span className="text-sm font-medium text-[var(--monarch-text-dark)]">{username}</span>
      </div>

      {/* Idea content */}
      <h3 className="text-sm font-medium text-[var(--monarch-text-dark)] leading-snug mb-3 line-clamp-2">
        {idea.title}
      </h3>

      {/* Vote count - hidden during dev cycle */}
      {!isInDevCycle && (
        <div className={`flex items-center gap-2 ${isMorphingToDev ? 'morph-element-out' : ''}`}>
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--monarch-bg-page)] ${
              showVoteAnimation && !reducedMotion ? 'upvote-bounce' : ''
            }`}
          >
            <ThumbsUp
              className={`h-3.5 w-3.5 transition-colors ${
                showVoteAnimation
                  ? 'text-[var(--monarch-orange)]'
                  : 'text-[var(--monarch-text-muted)]'
              }`}
            />
            <span
              className={`text-xs font-semibold ${
                showVoteAnimation && !reducedMotion ? 'vote-count-roll' : ''
              } ${
                showVoteAnimation
                  ? 'text-[var(--monarch-orange)]'
                  : 'text-[var(--monarch-text-dark)]'
              }`}
            >
              {displayedVotes}
            </span>
          </div>

          {/* Category badge */}
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--monarch-orange)]/10 text-[var(--monarch-orange)] font-medium">
            {idea.category}
          </span>
        </div>
      )}

      {/* Developers row - shows during in-progress */}
      {isInProgress && developers.length > 0 && (
        <div className="mb-3">
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

      {/* Progress bar - shows during dev cycle */}
      {(showDevFeatures || isInDevCycle) && (
        <div className={`h-2 rounded-full bg-[var(--monarch-bg-page)] overflow-hidden ${!isInDevCycle ? 'mt-3 morph-element-in' : ''}`}>
          <div
            className="h-full rounded-full transition-all duration-100 ease-out"
            style={{
              backgroundColor: isShipped ? 'var(--monarch-success)' : 'var(--monarch-info)',
              width: `${isInDevCycle ? devProgress : 0}%`,
            }}
          />
        </div>
      )}

      {/* Shipped checkmark */}
      {isShipped && (
        <div className="flex items-center gap-2 mt-3">
          <div
            className="flex items-center justify-center h-6 w-6 rounded-full"
            style={{ backgroundColor: 'var(--monarch-success)' }}
          >
            <Check className="h-4 w-4 text-white" />
          </div>
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--monarch-success)' }}
          >
            Feature delivered!
          </span>
        </div>
      )}
    </div>
  );
}
