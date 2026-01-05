/**
 * IdeatorAvatar Component
 *
 * Displays an ideator's avatar with a light bulb badge.
 * Used for community idea submissions.
 */

import { memo } from 'react';
import { Lightbulb } from 'lucide-react';

export interface IdeatorAvatarProps {
  /** Avatar image URL */
  avatarUrl: string;
  /** Username for accessibility */
  username: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

const SIZE_CLASSES = {
  sm: {
    avatar: 'h-6 w-6',
    badge: 'h-2.5 w-2.5',
    icon: 'h-1.5 w-1.5',
    badgePosition: '-bottom-0 -right-0',
  },
  md: {
    avatar: 'h-8 w-8',
    badge: 'h-3 w-3',
    icon: 'h-2 w-2',
    badgePosition: '-bottom-0 -right-0',
  },
};

/**
 * An ideator avatar with a light bulb badge indicating they submitted an idea.
 */
export const IdeatorAvatar = memo(function IdeatorAvatar({
  avatarUrl,
  username,
  size = 'md',
  className = '',
}: IdeatorAvatarProps) {
  const sizes = SIZE_CLASSES[size];

  return (
    <div className={`relative ${className}`}>
      <img
        src={avatarUrl}
        alt={`${username}'s avatar`}
        className={`${sizes.avatar} rounded-full bg-[var(--monarch-bg-page)]`}
      />
      <div
        className={`absolute ${sizes.badgePosition} ${sizes.badge} rounded-full bg-[var(--monarch-orange)] flex items-center justify-center`}
        aria-label="Idea contributor"
      >
        <Lightbulb className={`${sizes.icon} text-white`} />
      </div>
    </div>
  );
});
