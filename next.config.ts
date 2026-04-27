import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  devIndicators: {
    position: 'bottom-right',
  },
  async redirects() {
    return [
      // Phase 6 marketing-rebuild retirements: /build, /community, /resources,
      // /newsletter, /become-an-instructor are deleted; redirect to their new
      // homes. next-intl middleware passes the full path through, so register
      // both /path and /ja/path explicitly.
      { source: '/build', destination: '/explore', permanent: true },
      { source: '/ja/build', destination: '/ja/explore', permanent: true },
      { source: '/community', destination: '/about#aloha', permanent: true },
      { source: '/ja/community', destination: '/ja/about#aloha', permanent: true },
      { source: '/resources', destination: '/learn', permanent: true },
      { source: '/ja/resources', destination: '/ja/learn', permanent: true },
      { source: '/newsletter', destination: '/#newsletter', permanent: true },
      { source: '/ja/newsletter', destination: '/ja/#newsletter', permanent: true },
      // Catch-all for old issue archive permalinks.
      { source: '/newsletter/:slug*', destination: '/#newsletter', permanent: true },
      { source: '/ja/newsletter/:slug*', destination: '/ja/#newsletter', permanent: true },
      { source: '/become-an-instructor', destination: '/partnerships', permanent: true },
      { source: '/ja/become-an-instructor', destination: '/ja/partnerships', permanent: true },

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
