export type Theme = 'dark' | 'light';

export function getInitialTheme(): Theme {
  // Light mode disabled — not yet optimized. Always default to dark.
  return 'dark';
}

export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  document.documentElement.classList.add('theme-transitioning');
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('honuvibe-theme', theme);
  setTimeout(() => {
    document.documentElement.classList.remove('theme-transitioning');
  }, 300);
}

export function toggleTheme(): Theme {
  const current = (document.documentElement.getAttribute('data-theme') as Theme) || 'dark';
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
