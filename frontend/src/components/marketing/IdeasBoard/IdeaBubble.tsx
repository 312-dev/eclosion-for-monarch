/**
 * IdeaBubble Component
 *
 * Displays a single community idea with a fake user avatar and username.
 * Supports stacking effect with rotation and offset positioning.
 */

import { useState, useEffect } from 'react';
import { ThumbsUp } from 'lucide-react';
import type { PublicIdea } from '../../../types/ideas';
import { getUsernameForIdea, getAvatarSeedForIdea } from './useIdeasAnimation';

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
}

/** Generate a simple avatar using DiceBear API */
function getAvatarUrl(seed: number): string {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}&backgroundColor=f3f4f6`;
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

/** Get offset for stacked cards - visible stacking effect */
function getStackOffset(position: number, ideaId: string): { x: number; y: number } {
  const hash = ideaId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // Horizontal scatter based on hash + position
  const xBase = ((hash % 30) - 15);
  const xPosition = position === 0 ? -8 : position === 1 ? 6 : 0;
  return {
    x: xBase + xPosition,
    y: position * -8, // Stack upward with more spacing
  };
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
}: IdeaBubbleProps) {
  // _isUpvoting available for future use (continuous animation state)
  const [displayedVotes, setDisplayedVotes] = useState(idea.votes);
  const [showVoteAnimation, setShowVoteAnimation] = useState(false);
  const [lastVoteBonus, setLastVoteBonus] = useState(voteBonus);

  const username = getUsernameForIdea(idea.id);
  const avatarSeed = getAvatarSeedForIdea(idea.id);
  const avatarUrl = getAvatarUrl(avatarSeed);

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

  const animationClass = reducedMotion
    ? ''
    : isExiting
      ? 'idea-pop-out'
      : 'idea-pop-in';

  const stackStyle = {
    transform: `rotate(${rotation}deg) translate(${offset.x}px, ${offset.y}px)`,
    zIndex: stackPosition + 1,
    transition: isFeatured ? 'transform 0.4s ease-out' : undefined,
  };

  // Only show shadow on top card or non-stacked cards
  const shadowClass = isTopCard || !isStacked ? 'shadow-lg' : '';

  return (
    <div
      className={`rounded-xl border border-[var(--monarch-border)] bg-[var(--monarch-bg-card)] p-4 ${shadowClass} ${animationClass} ${isStacked ? 'absolute left-0 right-0 top-0' : 'relative'}`}
      style={isStacked ? stackStyle : undefined}
      role="article"
      aria-label={`Idea from ${username}: ${idea.title}`}
    >
      {/* User info */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={avatarUrl}
          alt=""
          className="h-8 w-8 rounded-full bg-[var(--monarch-bg-page)]"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-[var(--monarch-text-dark)]">{username}</span>
      </div>

      {/* Idea content */}
      <h3 className="text-sm font-medium text-[var(--monarch-text-dark)] leading-snug mb-3 line-clamp-2">
        {idea.title}
      </h3>

      {/* Vote count */}
      <div className="flex items-center gap-2">
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
    </div>
  );
}
