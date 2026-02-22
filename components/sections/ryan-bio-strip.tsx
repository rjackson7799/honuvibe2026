'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline, Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.3 0 .59.04.86.11V9a6.27 6.27 0 00-.86-.06 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.8a8.16 8.16 0 004.77 1.53V6.88a4.84 4.84 0 01-1.01-.19z" />
    </svg>
  );
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTubeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export function RyanBioStrip() {
  const t = useTranslations('bio');

  return (
    <Section id="about">
      <Container>
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
          {/* Text content — left on desktop */}
          <div className="order-2 md:order-1 flex flex-col gap-4">
            <Overline>{t('overline')}</Overline>
            <h2 className="font-serif text-h2 text-fg-primary">{t('heading')}</h2>
            <blockquote className="relative pl-4 border-l-2 border-accent-gold/50">
              <p className="text-base text-fg-secondary leading-relaxed italic">
                &ldquo;{t('quote')}&rdquo;
              </p>
            </blockquote>
            <p className="text-sm font-medium text-accent-teal">{t('role')}</p>

            {/* Social icons */}
            <div className="mt-2 flex items-center gap-3">
              {[
                { href: 'https://tiktok.com/@honuvibe', label: 'TikTok', Icon: TikTokIcon },
                { href: 'https://instagram.com/honuvibe', label: 'Instagram', Icon: InstagramIcon },
                { href: 'https://youtube.com/@honuvibe', label: 'YouTube', Icon: YouTubeIcon },
              ].map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded text-fg-secondary hover:text-fg-primary transition-colors duration-[var(--duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-teal"
                >
                  <Icon />
                </a>
              ))}
            </div>

            <div className="mt-2">
              <Link href="/about">
                <Button variant="ghost" icon={ArrowRight} iconPosition="right">
                  {t('cta')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Photo placeholder — right on desktop */}
          <div className="order-1 md:order-2 relative aspect-square max-w-[360px] mx-auto md:mx-0 md:ml-auto">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-teal/15 via-bg-secondary to-accent-gold/10 border border-border-default" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-fg-tertiary text-sm tracking-wide">Ryan Jackson</span>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
