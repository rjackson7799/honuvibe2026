/**
 * Source of truth for the demos shown on /sandbox.
 * Consumed by SandboxDemoGrid / SandboxDemoCard.
 *
 * Presentation metadata only — this file does not generate routes. Each demo
 * also follows the "adding a demo" checklist in
 * docs/plans/2026-07-13-sandbox-master.md (registry entry + i18n block →
 * app/sandbox/<slug>/layout.tsx → scoped CSS → mock data layer → screenshot →
 * flip status → QA).
 *
 * Copy lives in messages/{en,ja}.json under sandbox.demos.<key>.
 * This file owns structure, not text.
 */

export type SandboxDemo = {
  /** Route + analytics identifier ('miles-chaser'). */
  slug: string;
  /** i18n key: sandbox.demos.<key>.{name,tagline,alt} */
  key: string;
  /** /public path: '/sandbox/<slug>.webp' */
  image: string;
  stack: readonly string[];
  status: 'live' | 'coming_soon';
};

/** Single derivation of a demo's URL — demos live outside the locale tree. */
export const demoHref = (slug: string) => `/sandbox/${slug}`;

export const SANDBOX_DEMOS: readonly SandboxDemo[] = [
  {
    slug: 'miles-chaser',
    key: 'miles_chaser',
    image: '/sandbox/miles-chaser.webp',
    stack: ['Next.js', 'Tailwind CSS', 'SWR', 'Recharts'],
    // Held at coming_soon for launch — the demo tree ships but is not yet
    // publicly linked (Ryan 2026-07-20: MilesChaser not ready for public).
    status: 'coming_soon',
  },
  {
    slug: 'health-hub',
    key: 'health_hub',
    image: '/sandbox/health-hub.webp',
    stack: ['Next.js', 'React Query', 'Radix UI', 'Recharts'],
    status: 'coming_soon',
  },
] as const;
