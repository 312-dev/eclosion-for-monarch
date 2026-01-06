/**
 * Theme Initialization Script
 *
 * This script runs before React loads to prevent flash of wrong theme.
 * It reads the user's theme preference from localStorage and applies it
 * to the document before any content renders.
 */
(function () {
  var stored = localStorage.getItem('eclosion-theme-preference');
  var theme = 'light';
  if (stored === 'dark') {
    theme = 'dark';
  } else if (!stored || stored === 'system') {
    if (
      globalThis.matchMedia &&
      globalThis.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      theme = 'dark';
    }
  }
  document.documentElement.classList.add(theme);
  document.documentElement.dataset.theme = theme;
})();
