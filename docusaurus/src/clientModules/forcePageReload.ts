/**
 * Force Full Page Reload for Cross-System Links
 *
 * Docusaurus may intercept same-origin link clicks even when using `href` instead of `to`.
 * This module ensures that links to paths outside Docusaurus (like /demo, /, /features)
 * trigger a full page reload instead of client-side navigation.
 */

// Paths that should always trigger a full page reload (not Docusaurus routes)
const EXTERNAL_PATHS = ['/demo', '/download', '/features', '/login', '/unlock'];

// Check if a path should force a full page reload
function shouldForceReload(pathname: string): boolean {
  // Root path
  if (pathname === '/') return true;

  // Check if path starts with any external path
  return EXTERNAL_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
}

export function onRouteDidUpdate({ location }: { location: Location }) {
  // This runs after Docusaurus navigation - if we're on an external path,
  // force a full page reload to let the React app handle it
  if (shouldForceReload(location.pathname)) {
    // Use replace to avoid adding to history
    window.location.replace(location.pathname + location.search + location.hash);
  }
}

// Also intercept clicks on links before Docusaurus handles them
if (typeof window !== 'undefined') {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a');

      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Only handle same-origin relative paths
      if (href.startsWith('http://') || href.startsWith('https://')) return;
      if (href.startsWith('#')) return;

      // Check if this is an external path that should force reload
      if (shouldForceReload(href.split('?')[0].split('#')[0])) {
        event.preventDefault();
        event.stopPropagation();
        window.location.href = href;
      }
    },
    { capture: true } // Use capture to run before Docusaurus handlers
  );
}
