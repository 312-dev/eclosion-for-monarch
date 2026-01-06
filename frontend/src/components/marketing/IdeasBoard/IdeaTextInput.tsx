/**
 * IdeaTextInput Component
 *
 * Interactive text input with typewriter placeholder animation.
 * When submitted, redirects to GitHub Discussions with the message pre-filled.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { IDEAS_BOARD } from '../../../constants';
import { useIdeaInputSafe } from '../../../context';
import { useLandingContent } from '../../../hooks';

interface IdeaTextInputProps {
  readonly onFocus?: () => void;
  readonly onBlur?: () => void;
  readonly reducedMotion?: boolean;
}

const PLACEHOLDER_PROMPTS = [
  'How do you think we can make Monarch better?',
  'What feature would transform your budgeting?',
  'Share your idea with the community...',
  'What would make tracking expenses easier?',
];

const GITHUB_DISCUSSIONS_URL =
  'https://github.com/GraysonCAdams/eclosion-for-monarch/discussions/new';

function buildDiscussionUrl(ideaText: string): string {
  const params = new URLSearchParams({
    category: 'ideas',
    body: ideaText,
  });
  return `${GITHUB_DISCUSSIONS_URL}?${params.toString()}`;
}

export function IdeaTextInput({ onFocus, onBlur, reducedMotion }: IdeaTextInputProps) {
  const { getContent } = useLandingContent();
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [charIndex, setCharIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Coordinate with bottom input (CustomProblemCard)
  const ideaInput = useIdeaInputSafe();
  const isHidden = ideaInput?.isBottomInputVisible ?? false;

  // Transfer content to bottom input when this one hides
  useEffect(() => {
    if (isHidden && inputValue.trim()) {
      ideaInput?.setTransferredContent(inputValue);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync for content transfer
      setInputValue('');
    }
  }, [isHidden, inputValue, ideaInput]);

  // promptIndex is always valid (0 to length-1), so we can safely assert non-null
  const currentPrompt = PLACEHOLDER_PROMPTS[promptIndex % PLACEHOLDER_PROMPTS.length] as string;

  // Clear any existing timeout
  const clearTypewriter = useCallback(() => {
    if (typewriterRef.current) {
      clearTimeout(typewriterRef.current);
      typewriterRef.current = null;
    }
  }, []);

  // Typewriter effect
  useEffect(() => {
    // Don't animate if focused, reduced motion, or has input
    if (isFocused || reducedMotion || inputValue) {
      clearTypewriter();
      if (reducedMotion && !isFocused && !inputValue) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync for reduced motion fallback
        setDisplayedPlaceholder(currentPrompt);
      }
      return;
    }

    if (isTyping) {
      // Typing forward
      if (charIndex < currentPrompt.length) {
        typewriterRef.current = setTimeout(() => {
          setDisplayedPlaceholder(currentPrompt.slice(0, charIndex + 1));
          setCharIndex((prev) => prev + 1);
        }, IDEAS_BOARD.TYPEWRITER_SPEED);
      } else {
        // Finished typing, pause then start backspacing
        typewriterRef.current = setTimeout(() => {
          setIsTyping(false);
        }, IDEAS_BOARD.PROMPT_PAUSE);
      }
    } else {
      // Backspacing
      if (charIndex > 0) {
        typewriterRef.current = setTimeout(() => {
          setDisplayedPlaceholder(currentPrompt.slice(0, charIndex - 1));
          setCharIndex((prev) => prev - 1);
        }, IDEAS_BOARD.BACKSPACE_SPEED);
      } else {
        // Finished backspacing, move to next prompt
        setPromptIndex((prev) => (prev + 1) % PLACEHOLDER_PROMPTS.length);
        setIsTyping(true);
      }
    }

    return clearTypewriter;
  }, [
    charIndex,
    isTyping,
    currentPrompt,
    isFocused,
    reducedMotion,
    inputValue,
    clearTypewriter,
  ]);

  // Reset typewriter when prompt changes - intentional sync for prompt rotation
  useEffect(() => {
    if (!isFocused && !inputValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync for prompt rotation
      setCharIndex(0);
      setDisplayedPlaceholder('');
      setIsTyping(true);
    }
  }, [promptIndex, isFocused, inputValue]);

  const handleFocus = () => {
    setIsFocused(true);
    clearTypewriter();
    setDisplayedPlaceholder('');
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!inputValue) {
      // Restart typewriter after blur
      setCharIndex(0);
      setDisplayedPlaceholder('');
      setIsTyping(true);
    }
    onBlur?.();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const url = buildDiscussionUrl(inputValue.trim());
    window.open(url, '_blank', 'noopener,noreferrer');
    setInputValue('');
    inputRef.current?.blur();
  };

  const showCursor = !isFocused && !inputValue && !reducedMotion;

  // Don't render if hidden (after fade-out completes)
  if (isHidden) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="relative transition-opacity duration-300">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full px-4 py-3 pr-12 rounded-xl border border-[var(--monarch-text-muted)]/20 bg-[var(--monarch-bg-elevated)] text-[var(--monarch-text-dark)] text-sm placeholder:text-transparent focus:outline-none focus:ring-2 focus:ring-[var(--monarch-orange)]/50 focus:border-[var(--monarch-orange)] transition-all"
          aria-label="Share your idea"
        />

        {/* Custom placeholder with typewriter effect */}
        {!inputValue && (
          <div
            className="absolute left-4 right-12 top-1/2 -translate-y-1/2 pointer-events-none text-sm text-[var(--monarch-text-muted)] truncate"
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
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--monarch-orange)]/10 text-[var(--monarch-orange)]"
          aria-label={getContent('ideaSubmission', 'submitAriaLabel')}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Helper text */}
      <p className="mt-2 text-xs text-[var(--monarch-text-muted)] text-center">
        {getContent('ideaSubmission', 'helperText')}
      </p>
    </form>
  );
}
