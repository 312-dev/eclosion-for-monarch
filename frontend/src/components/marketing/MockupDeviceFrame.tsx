/**
 * MockupDeviceFrame
 *
 * Browser chrome wrapper for marketing page mockups.
 * Renders children inside a stylized browser frame with traffic lights.
 */

import type { ReactNode } from 'react';

interface MockupDeviceFrameProps {
  children: ReactNode;
  url?: string;
  className?: string;
}

export function MockupDeviceFrame({
  children,
  url = 'your.eclosion.app/recurring',
  className = '',
}: MockupDeviceFrameProps) {
  return (
    <div className={`mockup-device-frame ${className}`}>
      {/* Browser chrome header */}
      <div className="mockup-browser-chrome">
        {/* Traffic lights */}
        <div className="mockup-traffic-lights">
          <div
            className="mockup-traffic-light mockup-traffic-light-red"
            aria-hidden="true"
          />
          <div
            className="mockup-traffic-light mockup-traffic-light-yellow"
            aria-hidden="true"
          />
          <div
            className="mockup-traffic-light mockup-traffic-light-green"
            aria-hidden="true"
          />
        </div>

        {/* URL bar */}
        <div className="mockup-url-bar">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>{url}</span>
        </div>
      </div>

      {/* Content area */}
      <div className="mockup-content">{children}</div>
    </div>
  );
}
