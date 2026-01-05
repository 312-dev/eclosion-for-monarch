/**
 * ContributorAvatar Component
 *
 * Displays a GitHub contributor's avatar with optional username.
 * Links to their GitHub profile.
 */

import { memo } from 'react';
import { Tooltip } from './Tooltip';

export interface ContributorAvatarProps {
  /** GitHub username */
  username: string;
  /** GitHub avatar URL */
  avatarUrl: string;
  /** GitHub profile URL */
  profileUrl: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the username next to the avatar */
  showUsername?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

/**
 * A contributor avatar that links to their GitHub profile.
 */
export const ContributorAvatar = memo(function ContributorAvatar({
  username,
  avatarUrl,
  profileUrl,
  size = 'sm',
  showUsername = false,
  className = '',
}: ContributorAvatarProps) {
  return (
    <Tooltip content={`@${username}`}>
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity ${className}`}
        aria-label={`View ${username}'s GitHub profile`}
      >
        <img
          src={avatarUrl}
          alt={`@${username}`}
          className={`${SIZE_CLASSES[size]} rounded-full border border-[var(--monarch-border)]`}
          loading="lazy"
        />
        {showUsername && (
          <span className="text-sm text-[var(--monarch-text-muted)]">
            @{username}
          </span>
        )}
      </a>
    </Tooltip>
  );
});
