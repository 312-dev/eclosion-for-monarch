/**
 * MarkdownRenderer
 *
 * Renders markdown content with proper styling and interactive checkboxes.
 * Checkbox state is stored separately from note content.
 * Double-click to edit (except on checkboxes and links).
 */

import { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  /** Markdown content to display */
  content: string;
  /** Checkbox states (index -> checked) */
  checkboxStates?: boolean[];
  /** Callback when checkbox is toggled */
  onCheckboxToggle?: (index: number, checked: boolean) => void;
  /** Callback when double-clicked (to edit) */
  onDoubleClick?: () => void;
  /** Whether checkboxes are disabled (e.g., while loading) */
  checkboxesDisabled?: boolean;
  /** Optional class name */
  className?: string;
}

/**
 * Create a checkbox index tracker that can be passed to useMemo
 * This is a workaround for the issue where useMemo caches the closure
 * and the index variable persists across re-renders
 */
function createCheckboxTracker() {
  let index = 0;
  return {
    next: () => index++,
    reset: () => {
      index = 0;
    },
  };
}

export function MarkdownRenderer({
  content,
  checkboxStates = [],
  onCheckboxToggle,
  onDoubleClick,
  checkboxesDisabled = false,
  className = '',
}: MarkdownRendererProps) {
  // Create components fresh each render to ensure checkbox indices start at 0.
  // We intentionally don't use useMemo here because the tracker's internal state
  // would persist across re-renders, causing indices to drift.
  // The performance impact is minimal since this only affects the component config,
  // not the actual markdown parsing.
  const tracker = createCheckboxTracker();

  const components: Components = {
    // Override input to handle checkboxes
    input: ({ type, checked, ...props }) => {
      if (type === 'checkbox') {
        const currentIndex = tracker.next();
        const isChecked = checkboxStates[currentIndex] ?? checked ?? false;

        return (
          <input
            type="checkbox"
            checked={isChecked}
            disabled={checkboxesDisabled}
            onChange={(e) => {
              e.stopPropagation();
              if (!checkboxesDisabled) {
                onCheckboxToggle?.(currentIndex, e.target.checked);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className={`mr-2 ${checkboxesDisabled ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
            style={{
              accentColor: 'var(--monarch-orange)',
              width: '16px',
              height: '16px',
              verticalAlign: 'middle',
            }}
          />
        );
      }
      return <input type={type} checked={checked} {...props} />;
    },
    // Style links
    a: ({ children, href, ...props }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
        style={{ color: 'var(--monarch-orange)' }}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
      </a>
    ),
    // Style inline code
    code: ({ children, className: codeClassName, ...props }) => {
      const isInline = !codeClassName;
      if (isInline) {
        return (
          <code
            className="px-1 py-0.5 rounded text-sm"
            style={{
              backgroundColor: 'var(--monarch-bg-hover)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code className={codeClassName} {...props}>
          {children}
        </code>
      );
    },
    // Style blockquotes
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-3 pl-4 my-2 italic"
        style={{
          borderLeftWidth: '3px',
          borderColor: 'var(--monarch-orange)',
          color: 'var(--monarch-text-muted)',
        }}
        {...props}
      >
        {children}
      </blockquote>
    ),
    // Style horizontal rules
    hr: ({ ...props }) => (
      <hr className="my-4" style={{ borderTop: '1px solid var(--monarch-border)' }} {...props} />
    ),
    // Style unordered lists to ensure bullets show
    ul: ({ children, ...props }) => (
      <ul className="list-disc pl-5 my-2 space-y-1" {...props}>
        {children}
      </ul>
    ),
    // Style ordered lists
    ol: ({ children, ...props }) => (
      <ol className="list-decimal pl-5 my-2 space-y-1" {...props}>
        {children}
      </ol>
    ),
    // Style list items
    li: ({ children, className: liClassName, ...props }) => {
      // Task list items have a specific class from remark-gfm
      const isTaskItem = liClassName?.includes('task-list-item');
      return (
        <li className={isTaskItem ? 'list-none' : ''} {...props}>
          {children}
        </li>
      );
    },
    // Style headings - first:mt-0 removes top margin when first child
    h1: ({ children, ...props }) => (
      <h1
        className="text-xl font-semibold mt-4 first:mt-0 mb-2"
        style={{ color: 'var(--monarch-text-dark)' }}
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2
        className="text-lg font-semibold mt-3 first:mt-0 mb-2"
        style={{ color: 'var(--monarch-text-dark)' }}
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3
        className="text-base font-semibold mt-2 first:mt-0 mb-1"
        style={{ color: 'var(--monarch-text-dark)' }}
        {...props}
      >
        {children}
      </h3>
    ),
    // Style paragraphs
    p: ({ children, ...props }) => (
      <p className="my-1" {...props}>
        {children}
      </p>
    ),
    // Style pre blocks
    pre: ({ children, ...props }) => (
      <pre
        className="p-3 rounded-lg my-2 overflow-x-auto text-sm"
        style={{
          backgroundColor: 'var(--monarch-bg-hover)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}
        {...props}
      >
        {children}
      </pre>
    ),
  };

  // Handle double-click (but not on interactive elements)
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't trigger edit when clicking on checkboxes or links
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'A' ||
        target.closest('input') ||
        target.closest('a')
      ) {
        return;
      }
      onDoubleClick?.();
    },
    [onDoubleClick]
  );

  return (
    <>
      <style>{`
        .markdown-renderer > :first-child {
          margin-top: 0 !important;
        }
      `}</style>
      <div
        className={`markdown-renderer text-sm leading-relaxed ${className}`}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: onDoubleClick ? 'pointer' : 'default',
          color: 'var(--monarch-text-dark)',
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    </>
  );
}
