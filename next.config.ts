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
