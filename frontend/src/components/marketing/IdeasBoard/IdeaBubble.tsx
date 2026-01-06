/**
 * IdeaBubble Component
 *
 * Displays a single community idea with a fake user avatar and username.
 * Supports stacking effect with rotation and offset positioning.
 */

import { useState, useEffect, useRef } from 'react';
import { ThumbsUp, Code } from 'lucide-react';
import type { PublicIdea } from '../../../types/ideas';
import { getUsernameForIdea, getAvatarUrlForIdea } from './useIdeasAnimation';
import { IdeatorAvatar } from '../../ui/IdeatorAvatar';

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
  isMorphingOut: boolean
): string {
  if (reducedMotion) return '';
  if (isMorphingToDev) return 'idea-morph-to-dev';
  if (isMorphingOut) return 'idea-morph-out';
  if (isExiting) return 'idea-pop-out';
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

  // Calculate stack transforms
  const rotation = isStacked && !isFeatured ? getStackRotation(stackPosition, idea.id) : 0;
  const offset = isStacked && !isFeatured ? getStackOffset(stackPosition, idea.id) : { x: 0, y: 0 };

  const animationClass = getAnimationClass(stackPosition, !!isExiting, !!reducedMotion, isMorphingToDev, isMorphingOut);

  const stackStyle = {
    transform: `rotate(${rotation}deg) translate(${offset.x}px, ${offset.y}px)`,
    zIndex: stackPosition + 1,
    transition: isFeatured ? 'transform 0.4s ease-out' : undefined,
  };

  // Top card gets a more prominent shadow to emphasize it landing on the stack
  const shadowClass = isTopCard || !isStacked ? 'shadow-xl' : 'shadow-sm';
  const stackedOnClass = wasStackedOn ? 'idea-stacked-on' : '';

  return (
    <div
      className={`rounded-xl border border-[var(--monarch-text-muted)]/20 bg-[var(--monarch-bg-elevated)] p-4 ${shadowClass} ${animationClass} ${stackedOnClass} ${isStacked ? 'absolute left-0 right-0 top-0' : 'relative'}`}
      style={isStacked ? stackStyle : undefined}
      role="article"
      aria-label={`Idea from ${username}: ${idea.title}`}
    >
      {/* Stage badge - appears during morph to match DevCycleCard */}
      {isMorphingToDev && (
        <div
          className="absolute -top-3 left-4 px-3 py-1 rounded-full text-xs font-semibold text-white shadow-md morph-element-in"
          style={{ backgroundColor: 'var(--monarch-info)' }}
        >
          <span className="flex items-center gap-1.5">
            <Code className="h-3 w-3" />
            In Progress
          </span>
        </div>
      )}

      {/* Demo badge - appears during morph to match DevCycleCard */}
      {isMorphingToDev && (
        <span className="absolute -top-2 right-3 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--monarch-bg-page)] text-[var(--monarch-text-muted)] border border-[var(--monarch-border)] morph-element-in">
          Demo
        </span>
      )}

      {/* User info */}
      <div className={`flex items-center gap-3 mb-3 ${isMorphingToDev ? 'mt-3' : ''}`}>
        <IdeatorAvatar avatarUrl={avatarUrl} username={username} size="md" />
        <span className="text-sm font-medium text-[var(--monarch-text-dark)]">{username}</span>
      </div>

      {/* Idea content */}
      <h3 className="text-sm font-medium text-[var(--monarch-text-dark)] leading-snug mb-3 line-clamp-2">
        {idea.title}
      </h3>

      {/* Vote count - fades out during morph */}
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

      {/* Progress bar - appears during morph to match DevCycleCard */}
      {isMorphingToDev && (
        <div className="h-2 rounded-full bg-[var(--monarch-bg-page)] overflow-hidden mt-3 morph-element-in">
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: 'var(--monarch-info)',
              width: '0%',
            }}
          />
        </div>
      )}
    </div>
  );
}
