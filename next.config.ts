import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  // Keys are picomatch globs matched against the NORMALIZED route (leading
  // slash, no `app/` prefix, no trailing `/route` — see Next's
  // collect-build-traces.ts + normalizeAppPath). `*` stands in for [param]
  // segments: a literal `[reportId]` in a glob is a character class, not text.
  outputFileTracingIncludes: {
    '/api/tutoring/*/document': ['./lib/pdf/fonts/**'],
    '/api/courses/*/syllabus': ['./lib/pdf/fonts/**'],
    '/api/courses/*/sessions/*/presentation': ['./lib/pdf/fonts/**'],
  },
  devIndicators: {
    position: 'bottom-right',
  },
  experimental: {
    // Vault download uploader sends files up to 50 MB through a server action.
    // Default is 1 MB.
    serverActions: { bodySizeLimit: '52mb' },
  },
  async redirects() {
    return [
      // Phase 6 marketing-rebuild retirements: /build, /community, /resources,
      // /newsletter, /become-an-instructor are deleted; redirect to their new
      // homes. next-intl middleware passes the full path through, so register
      // both /path and /ja/path explicitly.
      // NOTE: temporary 307s (permanent: false) during the post-cutover soak
      // window so browsers don't permanently cache these redirects in case we
      // need to roll back to the legacy dark design (legacy-dark-design-prod
      // tag, branch legacy-dark-design at 08736f5). Promote back to 308
      // (permanent: true) after ~1–2 weeks of clean prod metrics.
      { source: '/build', destination: '/explore', permanent: false },
      { source: '/ja/build', destination: '/ja/explore', permanent: false },
      { source: '/community', destination: '/about#aloha', permanent: false },
      { source: '/ja/community', destination: '/ja/about#aloha', permanent: false },
      { source: '/resources', destination: '/learn', permanent: false },
      { source: '/ja/resources', destination: '/ja/learn', permanent: false },
      { source: '/newsletter', destination: '/#newsletter', permanent: false },
      { source: '/ja/newsletter', destination: '/ja/#newsletter', permanent: false },
      // Catch-all for old issue archive permalinks.
      { source: '/newsletter/:slug*', destination: '/#newsletter', permanent: false },
      { source: '/ja/newsletter/:slug*', destination: '/ja/#newsletter', permanent: false },
      { source: '/become-an-instructor', destination: '/partnerships', permanent: false },
      { source: '/ja/become-an-instructor', destination: '/ja/partnerships', permanent: false },

      // Resources alias chain → terminate directly at /learn (was /resources, now deleted).
      { source: '/tools', destination: '/learn', permanent: true },
      { source: '/toolkit', destination: '/learn', permanent: true },
      { source: '/stack', destination: '/learn', permanent: true },
      { source: '/ja/tools', destination: '/ja/learn', permanent: true },
      { source: '/ja/toolkit', destination: '/ja/learn', permanent: true },
      { source: '/ja/stack', destination: '/ja/learn', permanent: true },
      { source: '/dictionary', destination: '/glossary', permanent: true },
      { source: '/ja/dictionary', destination: '/ja/glossary', permanent: true },
      { source: '/ai-glossary', destination: '/glossary', permanent: true },
      { source: '/ja/ai-glossary', destination: '/ja/glossary', permanent: true },
      // Newsletter alias chain → terminate directly at /#newsletter anchor.
      { source: '/emails', destination: '/#newsletter', permanent: true },
      { source: '/ja/emails', destination: '/ja/#newsletter', permanent: true },
      { source: '/archive', destination: '/#newsletter', permanent: true },
      { source: '/ja/archive', destination: '/ja/#newsletter', permanent: true },
      { source: '/tutorials', destination: '/learn/library', permanent: true },
      { source: '/ja/tutorials', destination: '/ja/learn/library', permanent: true },
      { source: '/library', destination: '/learn/library', permanent: true },
      { source: '/ja/library', destination: '/ja/learn/library', permanent: true },
      { source: '/videos', destination: '/learn/library', permanent: true },
      { source: '/ja/videos', destination: '/ja/learn/library', permanent: true },
      { source: '/exploration', destination: '/explore', permanent: true },
      { source: '/ja/exploration', destination: '/ja/explore', permanent: true },

      // Canonical B2B route is /organizations; keep a /learn/organizations alias
      // (it would otherwise resolve to the course-slug page).
      { source: '/learn/organizations', destination: '/organizations', permanent: true },
      { source: '/ja/learn/organizations', destination: '/ja/organizations', permanent: true },
    ];
  },
  async headers() {
    return [
      // Client preview mockups live under public/previews/ behind unguessable
      // paths. Mark them noindex at the header level (defense-in-depth alongside
      // the per-file <meta name="robots"> tag) so they can never be crawled or
      // surfaced before a deal closes.
      {
        source: '/previews/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        // Sandbox demo routes only (:path+ requires ≥1 segment — the /sandbox
        // landing itself stays indexable). Defense in depth alongside the
        // per-demo-layout robots meta tag.
        source: '/sandbox/:path+',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
export default withNextIntl(nextConfig);
