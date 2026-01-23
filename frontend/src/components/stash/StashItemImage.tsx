/**
 * StashItemImage - Displays a stash item's image
 *
 * Handles displaying images from different sources:
 * - Custom uploaded images (path-to-URL conversion in desktop)
 * - Logo URLs from bookmarks (direct URL)
 * - Fallback to emoji when no image
 */

import { useState, useEffect } from 'react';
import { useDemo } from '../../context/DemoContext';

interface StashItemImageProps {
  readonly customImagePath?: string | null | undefined;
  readonly logoUrl?: string | null | undefined;
  readonly emoji?: string | undefined;
  readonly alt: string;
  readonly className?: string;
}

/** Load image URL from desktop file path via Electron IPC */
async function loadDesktopImageUrl(path: string): Promise<string | null> {
  if (!globalThis.electron?.stash) return null;
  try {
    return (await globalThis.electron.stash.getImageUrl(path)) ?? null;
  } catch {
    return null;
  }
}

/** Determine the image URL based on available sources */
async function resolveImageUrl(
  customImagePath: string | null | undefined,
  logoUrl: string | null | undefined,
  isDemo: boolean
): Promise<string | null> {
  if (customImagePath) {
    // If it's already an external URL (e.g., Openverse image), return directly
    if (customImagePath.startsWith('http://') || customImagePath.startsWith('https://')) {
      return customImagePath;
    }
    // If it's a data URL (base64), return directly
    if (customImagePath.startsWith('data:')) {
      return customImagePath;
    }
    // Demo mode: path IS the data URL; Desktop: load via IPC for local files
    return isDemo ? customImagePath : await loadDesktopImageUrl(customImagePath);
  }
  return logoUrl ?? null;
}

export function StashItemImage({
  customImagePath,
  logoUrl,
  emoji = '🎯',
  alt,
  className = '',
}: StashItemImageProps) {
  const isDemo = useDemo();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    resolveImageUrl(customImagePath, logoUrl, isDemo).then((url) => {
      if (cancelled) return;
      setHasError(false);
      setImageUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [customImagePath, logoUrl, isDemo]);

  // Show emoji fallback if no image or error loading
  if (!imageUrl || hasError) {
    return (
      <div
        className="flex items-center justify-center opacity-50"
        style={{ fontSize: 'min(50cqh, 96px)', lineHeight: 1 }}
      >
        {emoji}
      </div>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- onError is not user interaction
    <img src={imageUrl} alt={alt} className={className} onError={() => setHasError(true)} />
  );
}
