/**
 * ContributorList Component
 *
 * Displays feature attribution with ideator and contributors.
 * Shows "Ideated by" section followed by "Contributors" section.
 */

import { memo } from 'react';
import { ContributorAvatar } from './ContributorAvatar';
import { LightbulbIcon, UsersIcon } from '../icons';

export interface Contributor {
  username: string;
  avatarUrl: string;
  profileUrl: string;
  commits: number;
}

export interface ContributorListProps {
  /** The person who originated the feature idea */
  ideator?: Contributor | null;
  /** Code contributors */
  contributors: Contributor[];
  /** Maximum number of contributors to display before showing overflow */
  maxDisplay?: number;
  /** Display variant */
  variant?: 'compact' | 'detailed';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays feature attribution with ideator and contributors.
 */
export const ContributorList = memo(function ContributorList({
  ideator,
  contributors,
  maxDisplay = 5,
  variant = 'compact',
  className = '',
}: ContributorListProps) {
  const displayContributors = contributors.slice(0, maxDisplay);
  const overflow = contributors.length - maxDisplay;

  // Don't render if no attribution data
  if (!ideator && contributors.length === 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-4 flex-wrap ${className}`}>
        {/* Ideator */}
        {ideator && (
          <div className="flex items-center gap-1.5">
            <LightbulbIcon
              size={14}
              className="text-[var(--monarch-warning)] flex-shrink-0"
            />
            <span className="text-xs text-[var(--monarch-text-muted)]">
              Ideated by
            </span>
            <ContributorAvatar
              username={ideator.username}
              avatarUrl={ideator.avatarUrl}
              profileUrl={ideator.profileUrl}
              size="sm"
            />
          </div>
        )}

        {/* Contributors */}
        {contributors.length > 0 && (
          <div className="flex items-center gap-1.5">
            <UsersIcon
              size={14}
              className="text-[var(--monarch-text-muted)] flex-shrink-0"
            />
            <span className="text-xs text-[var(--monarch-text-muted)]">
              Community Devs
            </span>
            <div className="flex items-center -space-x-1.5 ml-0.5">
              {displayContributors.map((c) => (
                <ContributorAvatar
                  key={c.username}
                  username={c.username}
                  avatarUrl={c.avatarUrl}
                  profileUrl={c.profileUrl}
                  size="sm"
                />
              ))}
              {overflow > 0 && (
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--monarch-bg-hover)] text-xs text-[var(--monarch-text-muted)] border border-[var(--monarch-border)] ml-1"
                  title={`+${overflow} more`}
                >
                  +{overflow}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Detailed variant for feature pages
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Ideator */}
      {ideator && (
        <div className="flex items-center gap-2">
          <LightbulbIcon
            size={16}
            className="text-[var(--monarch-warning)] flex-shrink-0"
          />
          <span className="text-sm text-[var(--monarch-text-muted)]">
            Ideated by
          </span>
          <ContributorAvatar
            username={ideator.username}
            avatarUrl={ideator.avatarUrl}
            profileUrl={ideator.profileUrl}
            size="md"
            showUsername
          />
        </div>
      )}

      {/* Contributors */}
      {contributors.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <UsersIcon
            size={16}
            className="text-[var(--monarch-text-muted)] flex-shrink-0"
          />
          <span className="text-sm text-[var(--monarch-text-muted)]">
            Community Devs
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {contributors.map((c) => (
              <ContributorAvatar
                key={c.username}
                username={c.username}
                avatarUrl={c.avatarUrl}
                profileUrl={c.profileUrl}
                size="md"
                showUsername
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
