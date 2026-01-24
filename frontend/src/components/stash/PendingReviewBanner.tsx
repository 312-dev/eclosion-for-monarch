/**
 * PendingReviewBanner Component
 *
 * Solid orange banner displayed above the page title when there are pending bookmarks.
 * Clicking the underlined text scrolls to and expands the pending review section.
 */

interface PendingReviewBannerProps {
  count: number;
  onExpand: () => void;
}

export function PendingReviewBanner({ count, onExpand }: PendingReviewBannerProps) {
  if (count <= 0) return null;

  return (
    <div
      className="px-4 py-2.5 rounded-lg"
      style={{
        backgroundColor: 'var(--monarch-orange)',
      }}
    >
      <button
        type="button"
        onClick={onExpand}
        className="text-sm font-medium hover:opacity-80 transition-opacity text-white bg-transparent border-none cursor-pointer"
      >
        {count} new stash {count === 1 ? 'link' : 'links'}{' '}
        <span className="underline">pending your review</span>
      </button>
    </div>
  );
}
