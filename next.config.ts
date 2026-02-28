import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/tools', destination: '/resources', permanent: true },
      { source: '/toolkit', destination: '/resources', permanent: true },
      { source: '/stack', destination: '/resources', permanent: true },
      { source: '/ja/tools', destination: '/ja/resources', permanent: true },
      { source: '/ja/toolkit', destination: '/ja/resources', permanent: true },
      { source: '/ja/stack', destination: '/ja/resources', permanent: true },
      { source: '/dictionary', destination: '/glossary', permanent: true },
      { source: '/ja/dictionary', destination: '/ja/glossary', permanent: true },
      { source: '/ai-glossary', destination: '/glossary', permanent: true },
      { source: '/ja/ai-glossary', destination: '/ja/glossary', permanent: true },
      { source: '/emails', destination: '/newsletter', permanent: true },
      { source: '/ja/emails', destination: '/ja/newsletter', permanent: true },
      { source: '/archive', destination: '/newsletter', permanent: true },
      { source: '/ja/archive', destination: '/ja/newsletter', permanent: true },
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
    ],
  },
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
export default withNextIntl(nextConfig);
