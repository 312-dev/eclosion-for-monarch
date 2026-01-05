/**
 * Why Eclosion Section
 *
 * Bento-grid style layout with visual interest and personality.
 */

import { useState } from 'react';
import {
  ZapIcon,
  HeartHandshakeIcon,
  LockIcon,
  SyncIcon,
  ClockIcon,
  GitHubIcon,
} from '../icons';
import { ApiSyncAnimation } from './ApiSyncAnimation';
import { useLandingContent } from '../../hooks';

function BentoCard({
  children,
  className = '',
  color,
  hoverColor,
}: {
  children: React.ReactNode;
  className?: string;
  color: string;
  hoverColor: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative rounded-2xl border-2 p-6 transition-all duration-300 ${className}`}
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        borderColor: isHovered ? color : 'var(--monarch-border)',
        boxShadow: isHovered ? `0 8px 32px -8px ${hoverColor}` : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  );
}

export function WhyEclosionSection() {
  const { getContent, isCoderMode } = useLandingContent();

  return (
    <section className="px-4 sm:px-6 py-20 bg-[var(--monarch-bg-card)]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            className="text-2xl sm:text-3xl font-bold text-[var(--monarch-text-dark)] mb-4"
            style={{ fontFamily: "'Unbounded', sans-serif" }}
          >
            Why Eclosion?
          </h2>
          <p className="text-lg text-[var(--monarch-text)]">
            Built by Monarch users, for Monarch users.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:auto-rows-[140px]">
          {/* Real Integration - Large hero card */}
          <BentoCard
            className="md:col-span-4 md:row-span-2"
            color="#f97316"
            hoverColor="rgba(249, 115, 22, 0.3)"
          >
            <div className="flex h-full">
              {/* Left: Content */}
              <div className="flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)' }}
                    >
                      <ZapIcon size={24} style={{ color: '#f97316' }} />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--monarch-text-dark)]">
                      Real Integration
                    </h3>
                  </div>
                  <p className="text-[var(--monarch-text)] text-lg leading-relaxed max-w-md">
                    Not a browser extension or read-only viewer. Eclosion connects
                    directly to Monarch and can adjust categories, update targets,
                    and keep your budget in sync — all automatically.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--monarch-text-muted)] mt-4">
                  <span className="px-2 py-1 rounded-full bg-[var(--monarch-bg-page)]">
                    Two-way sync
                  </span>
                  <span className="px-2 py-1 rounded-full bg-[var(--monarch-bg-page)]">
                    Auto-updates
                  </span>
                  <span className="px-2 py-1 rounded-full bg-[var(--monarch-bg-page)]">
                    No manual entry
                  </span>
                </div>
              </div>
              {/* Right: Animation */}
              <div className="hidden md:flex items-center justify-center w-48 flex-shrink-0">
                <ApiSyncAnimation />
              </div>
            </div>
          </BentoCard>

          {/* Community - Tall card with GitHub link */}
          <BentoCard
            className="md:col-span-2 md:row-span-2 flex flex-col justify-between"
            color="#a78bfa"
            hoverColor="rgba(167, 139, 250, 0.3)"
          >
            <div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(167, 139, 250, 0.15)' }}
              >
                <HeartHandshakeIcon size={24} style={{ color: '#a78bfa' }} />
              </div>
              <h3 className="text-lg font-bold text-[var(--monarch-text-dark)] mb-2">
                Community-Powered
              </h3>
              <p className="text-sm text-[var(--monarch-text)] leading-relaxed">
                {getContent('whyEclosion', 'communityDescription')}
              </p>
            </div>
            {isCoderMode && (
              <a
                href="https://github.com/monarchmoney/eclosion"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80 mt-4"
                style={{ color: '#a78bfa' }}
              >
                <GitHubIcon size={18} />
                View on GitHub
              </a>
            )}
          </BentoCard>

          {/* Fully Yours - Wide card */}
          <BentoCard
            className="md:col-span-3 flex items-center gap-4"
            color="#2dd4bf"
            hoverColor="rgba(45, 212, 191, 0.3)"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(45, 212, 191, 0.15)' }}
            >
              <LockIcon size={24} style={{ color: '#2dd4bf' }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--monarch-text-dark)] mb-1">
                Fully Yours
              </h3>
              <p className="text-sm text-[var(--monarch-text)]">
                {getContent('whyEclosion', 'fullyYoursDescription')}
              </p>
            </div>
          </BentoCard>

          {/* Always In Sync - Square card */}
          <BentoCard
            className="md:col-span-3 flex items-center gap-4"
            color="#38bdf8"
            hoverColor="rgba(56, 189, 248, 0.3)"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)' }}
            >
              <SyncIcon size={24} style={{ color: '#38bdf8' }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--monarch-text-dark)] mb-1">
                Always In Sync
              </h3>
              <p className="text-sm text-[var(--monarch-text)]">
                Changes flow to Monarch automatically. Update here, see it
                there. No double-entry.
              </p>
            </div>
          </BentoCard>

          {/* Set It and Forget It - Wide card */}
          <BentoCard
            className="md:col-span-6 flex items-center justify-between"
            color="#fbbf24"
            hoverColor="rgba(251, 191, 36, 0.3)"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)' }}
              >
                <ClockIcon size={24} style={{ color: '#fbbf24' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--monarch-text-dark)] mb-1">
                  Set It and Forget It
                </h3>
                <p className="text-sm text-[var(--monarch-text)]">
                  Configure once. Eclosion handles the calculations, updates
                  targets, and keeps everything current while you sleep.
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--monarch-text-muted)]">
              <span className="px-3 py-1.5 rounded-full border border-[var(--monarch-border)]">
                Auto-calculate savings
              </span>
              <span className="px-3 py-1.5 rounded-full border border-[var(--monarch-border)]">
                Update budget targets
              </span>
              <span className="px-3 py-1.5 rounded-full border border-[var(--monarch-border)]">
                Track progress
              </span>
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
