/**
 * WishlistItemImage - Displays a wishlist item's image
 *
 * Handles the complexity of displaying images from different sources:
 * - Custom uploaded images (need path-to-URL conversion in desktop mode)
 * - Logo URLs from bookmarks (direct URL)
 * - Fallback to emoji when no image
 */

import { useState, useEffect } from 'react';
import { useDemo } from '../../context/DemoContext';

interface WishlistItemImageProps {
  /** Path to custom uploaded image (file path in desktop, data URL in demo) */
  readonly customImagePath?: string | null | undefined;
  /** URL to logo from bookmark source */
  readonly logoUrl?: string | null | undefined;
  /** Emoji to show as fallback */
  readonly emoji?: string | undefined;
  /** Alt text for the image */
  readonly alt: string;
  /** Additional CSS classes */
  readonly className?: string;
}

/**
 * Component that handles displaying wishlist item images.
 * In desktop mode, converts file paths to data URLs via Electron IPC.
 */
export function WishlistItemImage({
  customImagePath,
  logoUrl,
  emoji = '🎯',
  alt,
  className = '',
}: WishlistItemImageProps) {
  const isDemo = useDemo();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadImageUrl() {
      // Reset error state when source changes
      setHasError(false);

      if (customImagePath) {
        if (isDemo) {
          // In demo mode, the path IS the data URL
          if (!cancelled) {
            setImageUrl(customImagePath);
          }
        } else if (window.electron?.wishlist) {
          // Desktop mode: convert file path to data URL
          try {
            const url = await window.electron.wishlist.getImageUrl(customImagePath);
            if (!cancelled && url) {
              setImageUrl(url);
            } else if (!cancelled) {
              setImageUrl(null);
            }
          } catch {
            if (!cancelled) {
              setImageUrl(null);
            }
          }
        }
      } else if (logoUrl) {
        // Use logo URL directly
        if (!cancelled) {
          setImageUrl(logoUrl);
        }
      } else {
        if (!cancelled) {
          setImageUrl(null);
        }
      }
    }

    loadImageUrl();
    return () => {
      cancelled = true;
    };
  }, [customImagePath, logoUrl, isDemo]);

  // Show emoji fallback if no image or error loading
  // Uses container query height units to scale emoji to 50% of card image height
  // Capped at 96px to prevent blurry bitmap scaling on macOS
  if (!imageUrl || hasError) {
    return (
      <div
        className="flex items-center justify-center opacity-50"
        style={{
          fontSize: 'min(50cqh, 96px)',
          lineHeight: 1,
        }}
      >
        {emoji}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
