/**
 * AnimatedEmoji - Displays animated Telegram emojis on hover
 *
 * Shows a static emoji character by default, and plays the animated
 * version (webp) when isAnimating is true. The animated image uses
 * browser lazy loading and is always kept in DOM once rendered to
 * avoid reload flicker on subsequent hovers.
 */

import { memo, useState } from 'react';
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

  // Show animated version when animating and image is loaded
  const showAnimated = isAnimating && imageLoaded;

  return (
    <span
      className={`inline-flex items-center justify-center relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Static emoji - shown when not animating or image not loaded */}
      <span
        className="transition-opacity duration-150"
        style={{
          fontSize: size * 0.85,
          lineHeight: 1,
          opacity: showAnimated ? 0 : 1,
        }}
        aria-hidden="true"
      >
        {emoji}
      </span>

      {/* Animated emoji - always rendered, uses browser lazy loading */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- onLoad/onError are lifecycle events, not interactive */}
      <img
        src={animatedUrl}
        alt=""
        loading="lazy"
        className="absolute inset-0 transition-opacity duration-150"
        style={{
          width: size,
          height: size,
          opacity: showAnimated ? 1 : 0,
        }}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />
    </span>
  );
});
