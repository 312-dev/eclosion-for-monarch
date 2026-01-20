/**
 * IdeasBoard Component
 *
 * Main container for the Ideas Board animation.
 * Shows ideas stacking up at angles, then one gets votes and ships.
 */

import { useMemo } from 'react';
import type { PublicIdea } from '../../../types/ideas';
import { useIdeasAnimation } from './useIdeasAnimation';
import { IdeaBubble } from './IdeaBubble';
import { IdeaTextInput } from './IdeaTextInput';
import { getAvailableFeatures } from '../../../data/features';

// Hardcoded ideas for the marketing animation
const HARDCODED_IDEAS: PublicIdea[] = [
  {
    id: 'idea-1',
    title: 'Inbox Sync',
    description: 'Automatically extract transaction details from merchant receipts and invoices in your email.',
    votes: 12,
    category: 'Feature',
    discussionUrl: null,
    discussionNumber: null,
    status: 'open',
    closedReason: null,
    closedAt: null,
    source: 'github',
    author: null,
  },
  {
    id: 'idea-2',
    title: 'Transaction Linking',
    description: 'Associate related transactions together for better tracking and reporting.',
    votes: 8,
    category: 'Feature',
    discussionUrl: null,
    discussionNumber: null,
    status: 'open',
    closedReason: null,
    closedAt: null,
    source: 'github',
    author: null,
  },
  {
    id: 'idea-3',
    title: 'Goal Templates',
    description: 'Pre-built savings goal templates for common objectives like emergency funds and vacations.',
    votes: 15,
    category: 'Feature',
    discussionUrl: null,
    discussionNumber: null,
    status: 'open',
    closedReason: null,
    closedAt: null,
    source: 'github',
    author: null,
  },
  {
    id: 'idea-4',
    title: 'Budget Insights',
    description: 'AI-powered insights to help identify spending patterns and savings opportunities.',
    votes: 20,
    category: 'Feature',
    discussionUrl: null,
    discussionNumber: null,
    status: 'open',
    closedReason: null,
    closedAt: null,
    source: 'github',
    author: null,
  },
];

export function IdeasBoard() {
  const ideas = HARDCODED_IDEAS;

  const {
    stackedIdeas,
    visibleStackCount,
    featuredIdea,
    animationPhase,
    devCycleStage,
    isUpvoting,
    voteAccumulationCount,
    developers,
    devProgress,
    prefersReducedMotion,
    pause,
    resume,
  } = useIdeasAnimation(ideas);

  // Handle focus/blur to pause/resume animation
  const handleInputFocus = () => {
    pause();
  };

  const handleInputBlur = () => {
    resume();
  };

  const openIdeas = useMemo(() => ideas.filter((idea) => idea.status === 'open'), [ideas]);
  const shippedCount = useMemo(() => {
    // Count available features (tools the app has) + shipped ideas from community
    const availableFeaturesCount = getAvailableFeatures().length;
    const shippedIdeasCount = ideas.filter((i) => i.closedReason === 'eclosion-shipped').length;
    return availableFeaturesCount + shippedIdeasCount;
  }, [ideas]);

  // Determine if we should show fade-out for reset
  const isResetting = animationPhase === 'resetting';

  return (
    <section className="w-full max-w-sm mx-auto" aria-label="Community ideas board">
      {/* Container with subtle border for visual separation */}
      <div className="rounded-2xl border border-(--monarch-border) bg-(--monarch-bg-page) p-6 space-y-4">
        {/* Main animation area - fixed height to prevent jarring jumps between phases */}
        {/* Phase containers are absolute with top-5 to accommodate badges above cards */}
        <div
          className={`h-55 relative transition-opacity duration-500 ${
            isResetting ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {/* Stacking phase: Show ideas dropping in one at a time */}
          {(animationPhase === 'stacking' || animationPhase === 'accumulating-votes') && (
            <div className="absolute inset-x-0 top-5 h-50 pt-1">
              {stackedIdeas.slice(0, visibleStackCount).map((idea, index) => (
                <IdeaBubble
                  key={idea.id}
                  idea={idea}
                  isUpvoting={isUpvoting && index === visibleStackCount - 1}
                  voteBonus={index === visibleStackCount - 1 ? voteAccumulationCount : 0}
                  reducedMotion={prefersReducedMotion}
                  isStacked
                  stackPosition={index}
                  isFeatured={false}
                  isTopCard={index === visibleStackCount - 1}
                />
              ))}
            </div>
          )}

          {/* Morphing phase: Smooth transition from voting card to dev card */}
          {animationPhase === 'morphing-to-dev' && featuredIdea && (
            <div className="absolute inset-x-0 top-5 h-50 pt-1">
              {/* Show bottom cards fading out */}
              {stackedIdeas.slice(0, visibleStackCount - 1).map((idea, index) => (
                <IdeaBubble
                  key={idea.id}
                  idea={idea}
                  isUpvoting={false}
                  reducedMotion={prefersReducedMotion}
                  isStacked
                  stackPosition={index}
                  isFeatured={false}
                  isTopCard={false}
                  isMorphingOut
                />
              ))}
              {/* Top card morphs into dev card with pop animation */}
              <IdeaBubble
                key={featuredIdea.id}
                idea={featuredIdea}
                isUpvoting={false}
                voteBonus={voteAccumulationCount}
                reducedMotion={prefersReducedMotion}
                isStacked
                stackPosition={visibleStackCount - 1}
                isFeatured={false}
                isTopCard
                isMorphingToDev
              />
            </div>
          )}

          {/* Dev cycle: Show the featured idea going through the pipeline */}
          {/* Also show during 'resetting' so the card fades out with the container */}
          {(animationPhase === 'dev-cycle' || animationPhase === 'resetting') && featuredIdea && (
            <div className="absolute inset-x-0 top-5 h-50 pt-1">
              <IdeaBubble
                idea={featuredIdea}
                isUpvoting={false}
                reducedMotion={prefersReducedMotion}
                devCycleStage={devCycleStage}
                developers={developers}
                devProgress={devProgress}
              />
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-center gap-4 text-xs text-(--monarch-text-muted)">
          <span className="flex items-center gap-1">
            <span className="font-semibold text-(--monarch-text-dark)">{openIdeas.length}</span>
            open ideas
          </span>
          <span className="w-1 h-1 rounded-full bg-(--monarch-border)" />
          <span className="flex items-center gap-1">
            <span className="font-semibold text-(--monarch-success)">{shippedCount}</span>
            shipped
          </span>
        </div>

        {/* Input area */}
        <IdeaTextInput
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          reducedMotion={prefersReducedMotion}
        />
      </div>
    </section>
  );
}
