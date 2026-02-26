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

function LinkedInIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const socialLinks = [
  { href: 'https://tiktok.com/@honuvibe', label: 'TikTok', Icon: TikTokIcon },
  { href: 'https://instagram.com/honuvibe', label: 'Instagram', Icon: InstagramIcon },
  { href: 'https://youtube.com/@honuvibe', label: 'YouTube', Icon: YouTubeIcon },
  { href: 'https://linkedin.com/company/honuvibe', label: 'LinkedIn', Icon: LinkedInIcon },
];

export function ContactSocial() {
  const t = useTranslations('contact_page.social');

  return (
    <Section>
      <Container size="narrow">
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          centered
        />

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {socialLinks.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${label} (opens in new tab)`}
              className="group flex flex-col items-center gap-2.5 rounded-xl border border-border-default bg-bg-secondary p-6 cursor-pointer hover:border-accent-teal/30 hover:bg-bg-tertiary/50 transition-all duration-[var(--duration-normal)]"
            >
              <div className="text-fg-secondary group-hover:text-accent-teal transition-colors duration-[var(--duration-normal)]">
                <Icon />
              </div>
              <span className="text-sm font-medium text-fg-primary group-hover:text-fg-primary transition-colors duration-[var(--duration-normal)]">{label}</span>
            </a>
          ))}
        </div>
      </Container>
    </Section>
  );
}
