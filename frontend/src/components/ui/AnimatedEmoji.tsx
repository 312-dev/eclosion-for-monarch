/**
 * AnimatedEmoji - Displays animated Telegram emojis on hover
 *
 * Shows a static emoji character by default, and plays the animated
 * version (webp) when isAnimating is true. The animated image is only
 * rendered while animating, which restarts the animation from frame 1
 * on each hover. Browser caching ensures subsequent hovers are instant.
 */

import { memo, useState, useMemo, useEffect } from 'react';
import { getAnimatedEmojiUrl, hasAnimatedEmoji } from '../../data/animatedEmojiMap';

interface AnimatedEmojiProps {
  /** The emoji character to display */
  readonly emoji: string;
  /** Whether to show the animated version */
  readonly isAnimating?: boolean;
  /** Size of the emoji in pixels (default: 24) */
  readonly size?: number;
  /** Additional CSS classes */
  readonly className?: string;
}

export const AnimatedEmoji = memo(function AnimatedEmoji({
  emoji,
  isAnimating = false,
  size = 24,
  className = '',
}: AnimatedEmojiProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Generate a unique cache-buster when animation starts to restart from frame 1
  // useMemo ensures we get a new timestamp only when isAnimating changes to true
  // eslint-disable-next-line react-hooks/purity -- Intentionally impure to bust browser cache
  const cacheBuster = useMemo(() => (isAnimating ? Date.now() : 0), [isAnimating]);

  // Reset imageLoaded when emoji or cacheBuster changes so we don't flash stale state
  useEffect(() => {
    setImageLoaded(false);
  }, [emoji, cacheBuster]);

  const animatedUrl = getAnimatedEmojiUrl(emoji);
  const canAnimate = hasAnimatedEmoji(emoji) && !imageError && animatedUrl;

  // If no animated version or image failed to load, always show static emoji
  if (!canAnimate) {
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        style={{ fontSize: size * 0.85, lineHeight: 1 }}
        aria-hidden="true"
      >
        {emoji}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Static emoji - shown until animated image loads */}
      <span
        className="transition-opacity duration-150"
        style={{
          fontSize: size * 0.85,
          lineHeight: 1,
          opacity: isAnimating && imageLoaded ? 0 : 1,
        }}
        aria-hidden="true"
      >
        {emoji}
      </span>

      {/* Animated emoji - cache-busted URL restarts animation from frame 1 each hover */}
      {isAnimating && (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- onLoad/onError are lifecycle events, not interactive
        <img
          src={`${animatedUrl}?v=${cacheBuster}`}
          alt=""
          className="absolute inset-0"
          style={{
            width: size,
            height: size,
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
    </span>
  );
});
