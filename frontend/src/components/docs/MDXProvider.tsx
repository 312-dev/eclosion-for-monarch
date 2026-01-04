/**
 * MDX Provider - Provides custom components for MDX rendering
 */

import { MDXProvider as BaseMDXProvider } from '@mdx-js/react';
import type { ReactNode, ComponentPropsWithoutRef } from 'react';

// Custom components for MDX rendering
const components = {
  // Headings
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <h1
      className="text-2xl font-bold mb-4 mt-6"
      style={{ color: 'var(--monarch-text-dark)' }}
      {...props}
    />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2
      className="text-xl font-semibold mb-3 mt-5"
      style={{ color: 'var(--monarch-text-dark)' }}
      {...props}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3
      className="text-lg font-medium mb-2 mt-4"
      style={{ color: 'var(--monarch-text-dark)' }}
      {...props}
    />
  ),

  // Paragraphs
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p
      className="mb-4 leading-relaxed"
      style={{ color: 'var(--monarch-text-muted)' }}
      {...props}
    />
  ),

  // Lists
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="list-disc list-inside mb-4 space-y-1" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="list-decimal list-inside mb-4 space-y-1" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<'li'>) => (
    <li style={{ color: 'var(--monarch-text-muted)' }} {...props} />
  ),

  // Links
  a: (props: ComponentPropsWithoutRef<'a'>) => (
    <a
      className="underline hover:opacity-80"
      style={{ color: 'var(--monarch-orange)' }}
      target={props.href?.startsWith('http') ? '_blank' : undefined}
      rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      {...props}
    />
  ),

  // Code
  code: (props: ComponentPropsWithoutRef<'code'>) => (
    <code
      className="px-1.5 py-0.5 rounded text-sm font-mono"
      style={{
        backgroundColor: 'var(--monarch-bg-page)',
        color: 'var(--monarch-text-dark)',
      }}
      {...props}
    />
  ),
  pre: (props: ComponentPropsWithoutRef<'pre'>) => (
    <pre
      className="p-4 rounded-lg mb-4 overflow-x-auto text-sm"
      style={{
        backgroundColor: 'var(--monarch-bg-page)',
        border: '1px solid var(--monarch-border)',
      }}
      {...props}
    />
  ),

  // Blockquote (for admonitions)
  blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote
      className="border-l-4 pl-4 py-2 mb-4 italic"
      style={{
        borderColor: 'var(--monarch-orange)',
        backgroundColor: 'var(--monarch-bg-page)',
        color: 'var(--monarch-text-muted)',
      }}
      {...props}
    />
  ),

  // Horizontal rule
  hr: (props: ComponentPropsWithoutRef<'hr'>) => (
    <hr
      className="my-6"
      style={{ borderColor: 'var(--monarch-border)' }}
      {...props}
    />
  ),

  // Strong/Bold
  strong: (props: ComponentPropsWithoutRef<'strong'>) => (
    <strong style={{ color: 'var(--monarch-text-dark)' }} {...props} />
  ),
};

// Admonition components for tips, warnings, etc.
export function Tip({ children }: { children: ReactNode }) {
  return (
    <div
      className="p-4 rounded-lg mb-4 border-l-4"
      style={{
        backgroundColor: 'rgba(52, 211, 153, 0.1)',
        borderColor: 'rgb(52, 211, 153)',
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">💡</span>
        <div style={{ color: 'var(--monarch-text-muted)' }}>{children}</div>
      </div>
    </div>
  );
}

export function Warning({ children }: { children: ReactNode }) {
  return (
    <div
      className="p-4 rounded-lg mb-4 border-l-4"
      style={{
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderColor: 'rgb(251, 191, 36)',
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">⚠️</span>
        <div style={{ color: 'var(--monarch-text-muted)' }}>{children}</div>
      </div>
    </div>
  );
}

export function Info({ children }: { children: ReactNode }) {
  return (
    <div
      className="p-4 rounded-lg mb-4 border-l-4"
      style={{
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgb(59, 130, 246)',
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">ℹ️</span>
        <div style={{ color: 'var(--monarch-text-muted)' }}>{children}</div>
      </div>
    </div>
  );
}

interface MDXProviderProps {
  children: ReactNode;
}

export function MDXProvider({ children }: MDXProviderProps) {
  return (
    <BaseMDXProvider components={{ ...components, Tip, Warning, Info }}>
      {children}
    </BaseMDXProvider>
  );
}
