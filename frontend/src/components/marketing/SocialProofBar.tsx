/**
 * SocialProofBar
 *
 * Horizontal bar displaying credibility stats.
 * Shows GitHub stars, self-hosted badge, and privacy message.
 */

import { useEffect, useRef, useState } from 'react';
import { GitHubIcon, ShieldCheckIcon, ServerIcon } from '../icons';
import { useLandingContent } from '../../hooks';

export function SocialProofBar() {
  const { getContent } = useLandingContent();
  const [count, setCount] = useState(1);
  const [hasAnimated, setHasAnimated] = useState(false);
  const statRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let current = 1;
          const interval = setInterval(() => {
            current += 1;
            if (current >= 100) {
              setCount(100);
              clearInterval(interval);
            } else {
              setCount(current);
            }
          }, 20);
        }
      },
      { threshold: 0.5 }
    );

    if (statRef.current) {
      observer.observe(statRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <section className="px-4 sm:px-6 py-8 bg-[var(--monarch-bg-page)] border-y border-[var(--monarch-border)]">
      <div className="max-w-4xl mx-auto">
        <div className="social-proof-bar">
          {/* Open source */}
          <div className="social-proof-stat" ref={statRef}>
            <GitHubIcon size={18} />
            <span>{count}{getContent('socialProof', 'openSource')}</span>
          </div>

          {/* Self-hosted */}
          <div className="social-proof-stat">
            <ServerIcon size={18} />
            <span>Self-hosted</span>
          </div>

          {/* Privacy */}
          <div className="social-proof-stat">
            <ShieldCheckIcon size={18} />
            <span>Your data never leaves your server</span>
          </div>
        </div>
      </div>
    </section>
  );
}
