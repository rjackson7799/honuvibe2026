// Client navigation helper. In production the discovery tool is served from
// app.honuvibe.ai and the browser path is /discover/*. In local dev (no `app.`
// subdomain) it is previewed directly at /app-site/discover/*. This prefixes
// client-side router pushes so both work. API routes are never host-rewritten,
// so fetch('/api/discover/*') needs no prefix.

export function discoverBase(): string {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/app-site')) {
    return '/app-site';
  }
  return '';
}

export function discoverPath(path: string): string {
  return `${discoverBase()}${path}`;
}
