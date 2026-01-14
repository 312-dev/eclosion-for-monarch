/**
 * NoteEditorMDX
 *
 * Obsidian-style WYSIWYG markdown editor using MDXEditor.
 * Renders formatting inline as you type, reveals markdown when cursor enters.
 * Toolbar shows only when focused. Explicit save button instead of blur-based saving.
 */

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  ListsToggle,
  BlockTypeSelect,
  CreateLink,
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { evaluateMathExpression } from '../../utils/mathEvaluator';

interface MathSuggestion {
  expression: string;
  result: string;
}

interface NoteEditorMDXProps {
  /** Current markdown content */
  value: string;
  /** Callback when content changes */
  onChange: (value: string) => void;
  /** Callback to save and close the editor */
  onSave: () => void;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Min height in pixels */
  minHeight?: number;
  /** Optional class name */
  className?: string;
  /** Hide toolbar completely */
  hideToolbar?: boolean;
}

export function NoteEditorMDX({
  value,
  onChange,
  onSave,
  isSaving = false,
  placeholder = 'Write your note...',
  readOnly = false,
  autoFocus = false,
  minHeight = 120,
  className = '',
  hideToolbar = false,
}: NoteEditorMDXProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [mathSuggestion, setMathSuggestion] = useState<MathSuggestion | null>(null);

  // Check for math expressions at the end of the content
  const checkForMath = useCallback((text: string) => {
    // Strip trailing markdown formatting (**, *, _, `)
    const stripped = text.replace(/[\s*_`]+$/, '');

    // Look for math pattern at end of text, allowing optional leading $
    // Match: optional $, then digits/operators/parens (x allowed for multiply since * conflicts with markdown)
    const match = stripped.match(/\$?([\d.+\-*/xX()]+)$/);

    if (match?.[1] && match[1].length >= 3) {
      const expression = match[1];
      // Must have at least one operator (x/X for multiplication)
      if (/[+\-*/xX]/.test(expression)) {
        const result = evaluateMathExpression(expression);
        if (result !== null) {
          setMathSuggestion({
            expression,
            result: String(result),
          });
          return;
        }
      }
    }
    setMathSuggestion(null);
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync focus state with imperative focus call
      setIsFocused(true);
    }
  }, [autoFocus]);

  // Handle content changes
  const handleChange = useCallback(
    (markdown: string) => {
      onChange(markdown);
      checkForMath(markdown);
    },
    [onChange, checkForMath]
  );

  // Accept math suggestion
  const acceptMathSuggestion = useCallback(() => {
    if (!mathSuggestion || !editorRef.current) return;

    const currentMarkdown = editorRef.current.getMarkdown();
    const newMarkdown = currentMarkdown + `=${mathSuggestion.result}`;
    editorRef.current.setMarkdown(newMarkdown);
    onChange(newMarkdown);
    setMathSuggestion(null);

    // Keep focus in the editor after accepting
    requestAnimationFrame(() => {
      editorRef.current?.focus();
    });
  }, [mathSuggestion, onChange]);

  // Handle keyboard events for math suggestions and save shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+Enter to save
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onSave();
        return;
      }

      // Math suggestion handling
      if (!mathSuggestion || !isFocused) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        acceptMathSuggestion();
      } else if (e.key === 'Escape') {
        setMathSuggestion(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [mathSuggestion, isFocused, acceptMathSuggestion, onSave]);

  // Handle focus on the container (for toolbar visibility)
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  // Handle blur - only unfocus if focus leaves the container entirely
  const handleBlur = useCallback((e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const isInsideContainer = containerRef.current?.contains(relatedTarget);
    // Check for Radix UI portals (dropdowns, popovers)
    const isInsideRadixPortal = relatedTarget?.closest('[data-radix-popper-content-wrapper]');

    if (!isInsideContainer && !isInsideRadixPortal) {
      setIsFocused(false);
    }
  }, []);

  // Whether to show toolbar (used for CSS class, not for conditional rendering)
  const showToolbar = !hideToolbar && !readOnly;

  // Memoize plugins array to prevent MDXEditor re-initialization
  // Always include toolbar plugin - visibility controlled via CSS
  const plugins = useMemo(() => {
    const basePlugins = [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      markdownShortcutPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
    ];

    if (showToolbar) {
      basePlugins.unshift(
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <BlockTypeSelect />
              <BoldItalicUnderlineToggles />
              <ListsToggle />
              <CreateLink />
            </>
          ),
        })
      );
    }

    return basePlugins;
  }, [showToolbar]);

  // Set CSS custom property for dynamic min-height
  const containerStyle = {
    '--note-editor-min-height': `${minHeight}px`,
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      className={`note-editor-mdx ${className} ${isFocused ? 'is-focused' : ''}`}
      data-readonly={readOnly}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={containerStyle}
    >
      <div className="relative">
        <MDXEditor
          ref={editorRef}
          markdown={value}
          onChange={handleChange}
          placeholder={placeholder}
          readOnly={readOnly}
          plugins={plugins}
          contentEditableClassName="mdx-editor-content"
        />

        {/* Math suggestion - Gmail-style inline ghost text */}
        {mathSuggestion && isFocused && (
          <div className="note-editor-math-ghost">
            <span className="note-editor-math-ghost-text">
              ={mathSuggestion.result}
            </span>
            <span className="note-editor-math-ghost-hint">Tab</span>
          </div>
        )}
      </div>

      {/* Save button */}
      {!readOnly && (
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--monarch-tint)',
              color: 'white',
            }}
            aria-label="Save note"
            title="Save (Cmd+Enter)"
          >
            <Check size={14} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}
