/**
 * Note Editor
 *
 * Markdown editor with formatting toolbar and math auto-complete.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, List, Link, Code } from 'lucide-react';
import { evaluateMathExpression } from '../../utils/mathEvaluator';

interface NoteEditorProps {
  /** Initial content */
  value: string;
  /** Callback when content changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Min height in pixels */
  minHeight?: number;
}

interface MathSuggestion {
  expression: string;
  result: string;
  position: number;
}

export function NoteEditor({
  value,
  onChange,
  placeholder = 'Write your note...',
  autoFocus = false,
  minHeight = 120,
}: NoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mathSuggestion, setMathSuggestion] = useState<MathSuggestion | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
    }
  }, [value, minHeight]);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Check for math expressions
  const checkForMath = useCallback((text: string, cursorPos: number) => {
    // Look for math pattern ending at cursor: digits and operators (x allowed for multiply)
    const beforeCursor = text.slice(0, cursorPos);
    // eslint-disable-next-line sonarjs/slow-regex -- Safe: operates on short user input at cursor position
    const match = beforeCursor.match(/[\d.+\-*/xX()]+$/);

    if (match && match[0].length >= 3) {
      const expression = match[0];
      // Must have at least one operator (x/X for multiplication)
      if (/[+\-*/xX]/.test(expression)) {
        const result = evaluateMathExpression(expression);
        if (result !== null) {
          setMathSuggestion({
            expression,
            result: String(result),
            position: cursorPos - expression.length,
          });
          return;
        }
      }
    }
    setMathSuggestion(null);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    checkForMath(newValue, e.target.selectionStart);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Accept math suggestion with Tab
    if (mathSuggestion && e.key === 'Tab') {
      e.preventDefault();
      const before = value.slice(0, textareaRef.current?.selectionStart ?? 0);
      const after = value.slice(textareaRef.current?.selectionStart ?? 0);
      const newValue = before + ` (=${mathSuggestion.result})` + after;
      onChange(newValue);
      setMathSuggestion(null);

      // Move cursor after the inserted result
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = before.length + ` (=${mathSuggestion.result})`.length;
          textareaRef.current.selectionStart = newPos;
          textareaRef.current.selectionEnd = newPos;
        }
      }, 0);
    }

    // Dismiss suggestion on Escape
    if (mathSuggestion && e.key === 'Escape') {
      setMathSuggestion(null);
    }
  };

  const handleSelectionChange = () => {
    if (textareaRef.current) {
      checkForMath(value, textareaRef.current.selectionStart);
    }
  };

  // Formatting helpers
  const wrapSelection = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end);

    const newValue = value.slice(0, start) + before + selectedText + after + value.slice(end);
    onChange(newValue);

    // Restore selection
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = end + before.length;
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newValue = value.slice(0, start) + text + value.slice(start);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + text.length;
      textarea.selectionEnd = start + text.length;
    }, 0);
  };

  const handleBold = () => wrapSelection('**', '**');
  const handleItalic = () => wrapSelection('*', '*');
  const handleCode = () => wrapSelection('`', '`');
  const handleList = () => insertAtCursor('\n- ');
  const handleLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end);

    if (selectedText) {
      const newValue = value.slice(0, start) + `[${selectedText}](url)` + value.slice(end);
      onChange(newValue);
      // Select "url" for easy replacement
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = start + selectedText.length + 3;
        textarea.selectionEnd = start + selectedText.length + 6;
      }, 0);
    } else {
      insertAtCursor('[link text](url)');
    }
  };

  return (
    <div className="note-editor">
      {/* Formatting toolbar */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 border-b"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        <button
          type="button"
          onClick={handleBold}
          className="p-1.5 rounded hover:bg-(--monarch-bg-hover) transition-colors"
          style={{ color: 'var(--monarch-text-muted)' }}
          aria-label="Bold"
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={handleItalic}
          className="p-1.5 rounded hover:bg-(--monarch-bg-hover) transition-colors"
          style={{ color: 'var(--monarch-text-muted)' }}
          aria-label="Italic"
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={handleList}
          className="p-1.5 rounded hover:bg-(--monarch-bg-hover) transition-colors"
          style={{ color: 'var(--monarch-text-muted)' }}
          aria-label="List"
          title="Bullet list"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={handleLink}
          className="p-1.5 rounded hover:bg-(--monarch-bg-hover) transition-colors"
          style={{ color: 'var(--monarch-text-muted)' }}
          aria-label="Link"
          title="Insert link"
        >
          <Link size={16} />
        </button>
        <button
          type="button"
          onClick={handleCode}
          className="p-1.5 rounded hover:bg-(--monarch-bg-hover) transition-colors"
          style={{ color: 'var(--monarch-text-muted)' }}
          aria-label="Code"
          title="Inline code"
        >
          <Code size={16} />
        </button>

        {/* Character count */}
        <div className="ml-auto text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
          {value.length} chars
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelectionChange}
          placeholder={placeholder}
          className="w-full p-3 resize-none bg-transparent outline-none text-sm"
          style={{
            color: 'var(--monarch-text-dark)',
            minHeight: `${minHeight}px`,
          }}
          aria-label="Note content"
        />

        {/* Math suggestion - Gmail-style inline ghost text */}
        {mathSuggestion && (
          <div className="note-editor-math-ghost">
            <span className="note-editor-math-ghost-text">={mathSuggestion.result}</span>
            <span className="note-editor-math-ghost-hint">Tab</span>
          </div>
        )}
      </div>
    </div>
  );
}
