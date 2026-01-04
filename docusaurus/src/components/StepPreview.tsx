/**
 * StepPreview - Displays a preview of a wizard step
 *
 * Usage in MDX:
 * ```mdx
 * import { StepPreview } from '@site/src/components/StepPreview';
 *
 * <StepPreview step={1} title="Select Category Group" />
 * ```
 */

import React from 'react';

interface StepPreviewProps {
  /**
   * Step number (1-based)
   */
  step: number;
  /**
   * Step title
   */
  title: string;
  /**
   * Optional step description
   */
  description?: string;
  /**
   * Optional image path relative to static folder
   */
  imagePath?: string;
}

export function StepPreview({
  step,
  title,
  description,
  imagePath,
}: StepPreviewProps): JSX.Element {
  return (
    <div
      className="step-preview"
      style={{
        display: 'flex',
        gap: '1rem',
        padding: '1rem',
        marginBottom: '1rem',
        backgroundColor: 'var(--ifm-color-emphasis-100)',
        borderRadius: '8px',
        border: '1px solid var(--ifm-color-emphasis-200)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '50%',
          backgroundColor: 'var(--ifm-color-primary)',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '1.125rem',
          flexShrink: 0,
        }}
      >
        {step}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '1rem',
            marginBottom: description ? '0.25rem' : 0,
          }}
        >
          {title}
        </div>
        {description && (
          <div
            style={{
              fontSize: '0.875rem',
              color: 'var(--ifm-color-emphasis-700)',
            }}
          >
            {description}
          </div>
        )}
      </div>
      {imagePath && (
        <img
          src={imagePath}
          alt={`Step ${step}: ${title}`}
          style={{
            maxWidth: '200px',
            borderRadius: '4px',
            border: '1px solid var(--ifm-color-emphasis-300)',
          }}
        />
      )}
    </div>
  );
}

export default StepPreview;
