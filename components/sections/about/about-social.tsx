'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui';

function TikTokIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.3 0 .59.04.86.11V9a6.27 6.27 0 00-.86-.06 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.8a8.16 8.16 0 004.77 1.53V6.88a4.84 4.84 0 01-1.01-.19z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const socialLinks = [
  { href: 'https://tiktok.com/@honuvibe', label: 'TikTok', Icon: TikTokIcon },
  { href: 'https://instagram.com/honuvibe', label: 'Instagram', Icon: InstagramIcon },
  { href: 'https://youtube.com/@honuvibe', label: 'YouTube', Icon: YouTubeIcon },
];

export function AboutSocial() {
  const t = useTranslations('about_page.social');

  return (
    <Section>
      <Container size="narrow">
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          centered
        />

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {socialLinks.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-3 rounded-xl border border-border-default bg-bg-secondary p-8 hover:border-accent-teal/30 hover:bg-bg-tertiary/50 transition-all duration-[var(--duration-normal)]"
            >
              <div className="text-fg-secondary">
                <Icon />
              </div>
              <span className="text-sm font-medium text-fg-primary">{label}</span>
            </a>
          ))}
        </div>
      </Container>
    </Section>
  );
}
