/**
 * AnnotatedImage - Display screenshots with numbered callouts
 *
 * Usage in MDX:
 * ```mdx
 * import { AnnotatedImage } from '@site/src/components/AnnotatedImage';
 *
 * <AnnotatedImage
 *   src="/img/recurring-tab.png"
 *   alt="Recurring tab overview"
 *   callouts={[
 *     { x: 20, y: 15, label: "1", description: "The rollup zone combines small subscriptions" },
 *     { x: 70, y: 40, label: "2", description: "Individual items tracked separately" },
 *   ]}
 * />
 * ```
 */

import React, { useState } from 'react';

interface Callout {
  /** X position as percentage (0-100) */
  x: number;
  /** Y position as percentage (0-100) */
  y: number;
  /** Short label shown in the marker (usually a number) */
  label: string;
  /** Description shown on hover/click */
  description: string;
}

interface AnnotatedImageProps {
  /** Image source path */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Array of callout markers */
  callouts: Callout[];
  /** Optional caption below the image */
  caption?: string;
}

export function AnnotatedImage({
  src,
  alt,
  callouts,
  caption,
}: AnnotatedImageProps): JSX.Element {
  const [activeCallout, setActiveCallout] = useState<number | null>(null);

  return (
    <figure style={{ margin: '1.5rem 0' }}>
      <div
        style={{
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid var(--ifm-color-emphasis-300)',
        }}
      >
        <img
          src={src}
          alt={alt}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
          }}
        />
        {callouts.map((callout, index) => (
          <button
            key={index}
            onClick={() => setActiveCallout(activeCallout === index ? null : index)}
            onMouseEnter={() => setActiveCallout(index)}
            onMouseLeave={() => setActiveCallout(null)}
            aria-label={`Callout ${callout.label}: ${callout.description}`}
            style={{
              position: 'absolute',
              left: `${callout.x}%`,
              top: `${callout.y}%`,
              transform: 'translate(-50%, -50%)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'var(--ifm-color-primary)',
              color: 'white',
              border: '2px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.15s ease',
              ...(activeCallout === index && {
                transform: 'translate(-50%, -50%) scale(1.15)',
              }),
            }}
          >
            {callout.label}
          </button>
        ))}
        {activeCallout !== null && (
          <div
            style={{
              position: 'absolute',
              left: `${callouts[activeCallout].x}%`,
              top: `${callouts[activeCallout].y}%`,
              transform: 'translate(-50%, calc(-100% - 20px))',
              backgroundColor: 'var(--ifm-background-surface-color)',
              border: '1px solid var(--ifm-color-emphasis-300)',
              borderRadius: '6px',
              padding: '0.5rem 0.75rem',
              maxWidth: '200px',
              fontSize: '0.875rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 10,
            }}
          >
            {callouts[activeCallout].description}
          </div>
        )}
      </div>
      {caption && (
        <figcaption
          style={{
            textAlign: 'center',
            marginTop: '0.5rem',
            fontSize: '0.875rem',
            color: 'var(--ifm-color-emphasis-600)',
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export default AnnotatedImage;
