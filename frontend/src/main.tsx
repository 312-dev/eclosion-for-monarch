import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeApi } from './api/core/fetchApi'
import { isDesktopMode } from './utils/apiBase'
import { setBetaModeOverride, getBetaModeOverride, isBetaEnvironment, initializeDesktopBetaDetection } from './utils/environment'

// Expose beta mode helpers for local testing (accessible via browser console)
// Usage: eclosion.setBeta(true) to enable beta mode, eclosion.setBeta(null) to reset
declare global {
  // eslint-disable-next-line no-var
  var eclosion: {
    setBeta: typeof setBetaModeOverride;
    getBeta: typeof getBetaModeOverride;
    isBeta: typeof isBetaEnvironment;
  };
}
globalThis.eclosion = {
  setBeta: setBetaModeOverride,
  getBeta: getBetaModeOverride,
  isBeta: isBetaEnvironment,
};

// Register service worker (web only, not desktop)
if ('serviceWorker' in navigator && !isDesktopMode()) {
  globalThis.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('SW registration failed:', error);
    });
  });
}

// Handle SPA redirect from 404.html fallback
// When Cloudflare Pages can't match a route, 404.html redirects to / while
// storing the original path in sessionStorage. We restore it here.
const SPA_REDIRECT_KEY = 'spa-redirect';
const savedPath = sessionStorage.getItem(SPA_REDIRECT_KEY);
if (savedPath && savedPath !== '/' && savedPath !== globalThis.location.pathname) {
  sessionStorage.removeItem(SPA_REDIRECT_KEY);
  // Use replaceState to navigate without adding to history
  globalThis.history.replaceState(null, '', savedPath);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Initialize API for desktop mode (fetches backend port from Electron)
// This must complete before rendering to ensure API calls work
await initializeApi();

// Detect if desktop app is running a beta build (sets localStorage flag for isBetaEnvironment)
await initializeDesktopBetaDetection();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
