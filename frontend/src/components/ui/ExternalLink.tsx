/**
 * ExternalLink - Forces full page navigation for cross-system links
 *
 * Use this component for links between different systems:
 * - From marketing/demo to Docusaurus (/docs/*)
 * - Any link where you need to bypass React Router
 *
 * This prevents React Router from intercepting the click and doing
 * client-side navigation, which would cause rendering issues when
 * navigating between React app and Docusaurus.
 */

import type { AnchorHTMLAttributes, ReactNode } from 'react';

interface ExternalLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  children: ReactNode;
}

/**
 * A link component that forces full page navigation.
 * Use for links to /docs/* or any cross-system paths.
 */
export function ExternalLink({ to, children, ...props }: ExternalLinkProps) {
  return (
    <a href={to} {...props}>
      {children}
    </a>
  );
}

/**
 * Paths that should always use full page navigation (not React Router).
 * These are paths served by different systems (Docusaurus, etc.)
 */
export const EXTERNAL_PATHS = ['/docs'];

/**
 * Check if a path should use full page navigation instead of React Router.
 */
export function isExternalPath(pathname: string): boolean {
  return EXTERNAL_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
}
