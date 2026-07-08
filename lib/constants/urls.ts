/**
 * HonuVibe Studio storefront URL (studio.honuvibe.ai), served via the
 * host-based rewrite in middleware.ts. Single source of truth for the
 * `NEXT_PUBLIC_STUDIO_URL` fallback that was previously duplicated across
 * the marketing nav/footer, home persona router, Explore band, the Studio
 * root layout, and the studio-lead email. `NEXT_PUBLIC_*` vars are inlined
 * at build time, so this module-level constant resolves correctly in both
 * server and client components.
 */
export const STUDIO_URL =
  process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.honuvibe.ai';
