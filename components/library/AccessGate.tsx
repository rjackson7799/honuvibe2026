'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';

type AccessGateProps = {
  thumbnailUrl: string | null;
  videoSlug: string;
  locale: string;
  translations: {
    heading: string;
    sub: string;
    button: string;
    login: string;
  };
};

export function AccessGate({
  thumbnailUrl,
  videoSlug,
  locale,
  translations,
}: AccessGateProps) {
  const prefix = locale === 'ja' ? '/ja' : '';
  const redirectPath = `${prefix}/learn/library/${videoSlug}`;
  const signupUrl = `${prefix}/learn/auth?redirect=${encodeURIComponent(redirectPath)}`;
  const loginUrl = `${prefix}/learn/auth?mode=login&redirect=${encodeURIComponent(redirectPath)}`;

  useEffect(() => {
    trackEvent('access_gate_shown', { video_slug: videoSlug, locale });
  }, [videoSlug, locale]);

  return (
    <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
      {/* Blurred thumbnail background */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm brightness-50 rounded-lg"
        />
      ) : (
        <div className="absolute inset-0 bg-bg-tertiary rounded-lg" />
      )}

      {/* Overlay card */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-bg-secondary border border-border-default rounded-lg p-6 shadow-lg max-w-sm text-center">
          <h3 className="font-serif text-xl text-fg-primary">
            {translations.heading}
          </h3>
          <p className="text-sm text-fg-secondary mt-2">
            {translations.sub}
          </p>
          <a
            href={signupUrl}
            onClick={() =>
              trackEvent('access_gate_signup', { video_slug: videoSlug, locale })
            }
          >
            <Button variant="primary" className="mt-4 w-full">
              {translations.button}
            </Button>
          </a>
          <a
            href={loginUrl}
            className="block text-sm text-accent-teal mt-3 hover:underline"
          >
            {translations.login}
          </a>
        </div>
      </div>
    </div>
  );
}
