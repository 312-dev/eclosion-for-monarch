/**
 * DemoEmbed - Embeds the Eclosion demo app in documentation
 *
 * Usage in MDX:
 * ```mdx
 * import { DemoEmbed } from '@site/src/components/DemoEmbed';
 *
 * <DemoEmbed path="/recurring" height={400} />
 * ```
 */

import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

interface DemoEmbedProps {
  /**
   * Path within the demo app (e.g., "/recurring", "/settings", "/dashboard")
   */
  path: string;
  /**
   * Height of the iframe in pixels
   */
  height?: number;
  /**
   * Optional title for accessibility
   */
  title?: string;
}

function DemoEmbedInner({
  path,
  height = 500,
  title = 'Eclosion Demo',
}: DemoEmbedProps): JSX.Element {
  // Ensure path starts with /demo
  const demoPath = path.startsWith('/demo') ? path : `/demo${path}`;
  // Use current origin - works on any instance (stable, beta, self-hosted)
  const src = `${window.location.origin}${demoPath}`;

  return (
    <div className="demo-embed-container" style={{ marginBottom: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 1rem',
          backgroundColor: 'var(--ifm-color-emphasis-100)',
          borderRadius: '8px 8px 0 0',
          borderBottom: '1px solid var(--ifm-color-emphasis-300)',
        }}
      >
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
          Interactive Demo
        </span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '0.75rem' }}
        >
          Open in new tab →
        </a>
      </div>
      <iframe
        src={src}
        title={title}
        width="100%"
        height={height}
        style={{
          border: '1px solid var(--ifm-color-emphasis-300)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          backgroundColor: '#1a1a1a',
        }}
        loading="lazy"
        allow="clipboard-write"
      />
    </div>
  );
}

// Wrapper component that handles SSR - only renders on client
export function DemoEmbed(props: DemoEmbedProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div style={{ height: props.height || 500 }}>Loading demo...</div>}>
      {() => <DemoEmbedInner {...props} />}
    </BrowserOnly>
  );
}

export default DemoEmbed;
