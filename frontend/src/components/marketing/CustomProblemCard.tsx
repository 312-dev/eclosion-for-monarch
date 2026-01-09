import { useState, useEffect, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { IDEAS_BOARD } from '../../constants';
import { useIdeaInputSafe } from '../../context';
import { useLandingContent } from '../../hooks';

/**
 * CustomProblemCard
 *
 * A card that appears in the FrustrationSection when cards are dismissed.
 * Features a typewriter placeholder effect and submits to GitHub Discussions.
 */

const PLACEHOLDER_PROMPTS = [
  'I wish Monarch could track my HSA contributions...',
  'Splitting bills with roommates is a nightmare...',
  'I need better reports for tax season...',
  'Tracking reimbursements is confusing...',
  'I want to see my net worth over time...',
];

const GITHUB_DISCUSSIONS_URL =
  'https://github.com/312-dev/eclosion/discussions/new';

function buildDiscussionUrl(problemText: string): string {
  const params = new URLSearchParams({
    category: 'ideas',
    body: problemText,
  });
  return `${GITHUB_DISCUSSIONS_URL}?${params.toString()}`;
}

// Base height for 3 lines of text (line-height ~20px × 3 + py-3 padding 24px)
const MIN_HEIGHT = 84;
const MAX_HEIGHT = 200;

interface CustomProblemCardProps {
  readonly animationClass?: string;
  readonly colSpan?: 1 | 2 | 3;
}

// CSS class names for responsive column spans
const COL_SPAN_CLASSES = {
  1: 'frustration-card-single',
  2: 'frustration-card-double',
  3: 'frustration-card-full',
} as const;

export function CustomProblemCard({ animationClass = '', colSpan = 1 }: CustomProblemCardProps) {
  const { getContent } = useLandingContent();
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [charIndex, setCharIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Receive transferred content from the top input (IdeasBoard)
  const ideaInput = useIdeaInputSafe();

  useEffect(() => {
    if (ideaInput?.transferredContent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing transferred content from context to local state
      setInputValue(ideaInput.transferredContent);
      ideaInput.clearTransferredContent();
      // Focus the textarea to show the user their content is here
      textareaRef.current?.focus();
    }
  }, [ideaInput?.transferredContent, ideaInput]);

  const currentPrompt = PLACEHOLDER_PROMPTS[promptIndex % PLACEHOLDER_PROMPTS.length] as string;

  const clearTypewriter = useCallback(() => {
    if (typewriterRef.current) {
      clearTimeout(typewriterRef.current);
      typewriterRef.current = null;
    }
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (isFocused || inputValue) {
      clearTypewriter();
      return;
    }

    if (isTyping) {
      if (charIndex < currentPrompt.length) {
        typewriterRef.current = setTimeout(() => {
          setDisplayedPlaceholder(currentPrompt.slice(0, charIndex + 1));
          setCharIndex((prev) => prev + 1);
        }, IDEAS_BOARD.TYPEWRITER_SPEED);
      } else {
        typewriterRef.current = setTimeout(() => {
          setIsTyping(false);
        }, IDEAS_BOARD.PROMPT_PAUSE);
      }
    } else if (charIndex > 0) {
      typewriterRef.current = setTimeout(() => {
        setDisplayedPlaceholder(currentPrompt.slice(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);
      }, IDEAS_BOARD.BACKSPACE_SPEED);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync for prompt rotation
      setPromptIndex((prev) => (prev + 1) % PLACEHOLDER_PROMPTS.length);
      setIsTyping(true);
    }

    return clearTypewriter;
  }, [charIndex, isTyping, currentPrompt, isFocused, inputValue, clearTypewriter]);

  // Reset typewriter when prompt changes - intentional sync for prompt rotation
  useEffect(() => {
    if (!isFocused && !inputValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync for prompt rotation
      setCharIndex(0);
      setDisplayedPlaceholder('');
      setIsTyping(true);
    }
  }, [promptIndex, isFocused, inputValue]);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = `${MIN_HEIGHT}px`;
    const scrollHeight = textarea.scrollHeight;
    textarea.style.height = `${Math.min(Math.max(scrollHeight, MIN_HEIGHT), MAX_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [inputValue, adjustHeight]);

  const handleFocus = () => {
    setIsFocused(true);
    clearTypewriter();
    setDisplayedPlaceholder('');
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!inputValue) {
      setCharIndex(0);
      setDisplayedPlaceholder('');
      setIsTyping(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter without Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    const url = buildDiscussionUrl(inputValue.trim());
    window.open(url, '_blank', 'noopener,noreferrer');
    setInputValue('');
    textareaRef.current?.blur();
  };

  const showCursor = !isFocused && !inputValue;

  const colSpanClass = COL_SPAN_CLASSES[colSpan];
  const isFullWidth = colSpan === 3;

  return (
    <article
      className={`frustration-card ${colSpanClass} ${animationClass} ${isFullWidth ? 'spotlight-card' : ''}`.trim()}
    >
      <h3 className="text-lg font-semibold text-[var(--monarch-text-dark)] mb-3">
        Here&apos;s my problem...
      </h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            rows={3}
            className="w-full px-4 py-3 pr-12 rounded-xl border border-[var(--monarch-border)] bg-[var(--monarch-bg-page)] text-[var(--monarch-text-dark)] text-sm placeholder:text-transparent focus:outline-none focus:ring-2 focus:ring-[var(--monarch-orange)]/50 focus:border-[var(--monarch-orange)] transition-all resize-none overflow-hidden"
            style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
            aria-label="Describe your problem"
          />

          {/* Custom placeholder with typewriter effect */}
          {!inputValue && (
            <div
              className="absolute left-4 right-12 top-3 pointer-events-none text-sm text-[var(--monarch-text-muted)]"
              aria-hidden="true"
            >
              {displayedPlaceholder}
              {showCursor && <span className="typewriter-cursor">|</span>}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="absolute right-2 top-3 p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--monarch-orange)]/10 text-[var(--monarch-orange)]"
            aria-label="Submit to GitHub Discussions"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-xs text-[var(--monarch-text-muted)]">
          {getContent('customProblem', 'helperText')}
        </p>
      </form>
    </article>
  );
}
