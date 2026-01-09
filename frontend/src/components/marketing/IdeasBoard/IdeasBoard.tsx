/**
 * IdeasBoard Component
 *
 * Main container for the Ideas Board animation.
 * Shows ideas stacking up at angles, then one gets votes and ships.
 */

import { useState, useEffect, useMemo } from 'react';
import type { IdeasData, PublicIdea } from '../../../types/ideas';
import { useIdeasAnimation } from './useIdeasAnimation';
import { IdeaBubble } from './IdeaBubble';
import { IdeaTextInput } from './IdeaTextInput';
import { getAvailableFeatures } from '../../../data/features';

// Cloudflare Function URL (production) and GitHub raw fallback (local dev)
const IDEAS_API_URL = '/api/ideas';
const IDEAS_GITHUB_URL =
  'https://raw.githubusercontent.com/312-dev/eclosion/main/data/ideas.json';

// Detect if we're in local development (localhost or 127.0.0.1)
const isLocalDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export function IdeasBoard() {
  const [ideas, setIdeas] = useState<PublicIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch ideas on mount
  useEffect(() => {
    const fetchIdeas = async () => {
      setLoading(true);
      setError(null);

      try {
        let data: IdeasData | null = null;

        // In local dev, skip the CF function and go straight to GitHub
        if (!isLocalDev) {
          try {
            const response = await fetch(IDEAS_API_URL);
            if (response.ok) {
              const contentType = response.headers.get('content-type');
              if (contentType?.includes('application/json')) {
                data = (await response.json()) as IdeasData;
              }
            }
          } catch {
            // CF function not available, will fall through to GitHub
          }
        }

        // Fallback to GitHub raw (always works, CORS-enabled)
        if (!data) {
          const response = await fetch(IDEAS_GITHUB_URL);
          if (!response.ok) {
            throw new Error(`Failed to fetch ideas: ${response.status}`);
          }
          data = (await response.json()) as IdeasData;
        }

        setIdeas(data.ideas);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load ideas';
        setError(message);
        console.error('Failed to fetch ideas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchIdeas();
  }, []);

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

  if (loading) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <div className="rounded-xl border border-[var(--monarch-border)] bg-[var(--monarch-bg-card)] p-4 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-[var(--monarch-bg-page)]" />
            <div className="h-4 w-24 rounded bg-[var(--monarch-bg-page)]" />
          </div>
          <div className="h-4 w-full rounded bg-[var(--monarch-bg-page)] mb-2" />
          <div className="h-4 w-2/3 rounded bg-[var(--monarch-bg-page)]" />
        </div>
      </div>
    );
  }

  if (error || ideas.length === 0) {
    // Still show the input even if ideas failed to load
    return (
      <div className="w-full max-w-sm mx-auto space-y-4">
        <div className="rounded-xl border border-[var(--monarch-border)] bg-[var(--monarch-bg-card)] p-4 text-center">
          <p className="text-sm text-[var(--monarch-text-muted)]">
            {error ? 'Community ideas are loading...' : 'No ideas yet. Be the first!'}
          </p>
        </div>
        <IdeaTextInput reducedMotion={prefersReducedMotion} />
      </div>
    );
  }

  return (
    <section
      className="w-full max-w-sm mx-auto"
      aria-label="Community ideas board"
    >
      {/* Container with subtle border for visual separation */}
      <div className="rounded-2xl border border-[var(--monarch-border)] bg-[var(--monarch-bg-page)] p-6 space-y-4">
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
        <div className="flex items-center justify-center gap-4 text-xs text-[var(--monarch-text-muted)]">
          <span className="flex items-center gap-1">
            <span className="font-semibold text-[var(--monarch-text-dark)]">{openIdeas.length}</span>
            open ideas
          </span>
          <span className="w-1 h-1 rounded-full bg-[var(--monarch-border)]" />
          <span className="flex items-center gap-1">
            <span className="font-semibold text-[var(--monarch-success)]">{shippedCount}</span>
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
