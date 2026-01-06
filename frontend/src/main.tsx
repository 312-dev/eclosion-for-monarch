import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
