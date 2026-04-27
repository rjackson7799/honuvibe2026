import { useTranslations } from 'next-intl';
import {
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';
import {
  TikTokIcon,
  InstagramIcon,
  YouTubeIcon,
  LineIcon,
} from './social-icons';

type Social = {
  key: 'tiktok' | 'instagram' | 'youtube' | 'line';
  href: string;
  Icon: typeof TikTokIcon;
};

const SOCIALS: readonly Social[] = [
  { key: 'tiktok', href: 'https://www.tiktok.com/@honuvibe', Icon: TikTokIcon },
  {
    key: 'instagram',
    href: 'https://www.instagram.com/honuvibe',
    Icon: InstagramIcon,
  },
  {
    key: 'youtube',
    href: 'https://www.youtube.com/@honuvibe',
    Icon: YouTubeIcon,
  },
  { key: 'line', href: 'https://line.me/R/ti/p/@honuvibe', Icon: LineIcon },
];

export function AboutSocialSection() {
  const t = useTranslations('about.social_section');

  return (
    <Section variant="canvas">
      <Container>
        <div className="mb-12 text-center md:mb-14">
          <Overline tone="teal" className="mb-3.5 inline-block">
            {t('overline')}
          </Overline>
          <SectionHeading>{t('headline')}</SectionHeading>
        </div>

        <div className="mx-auto mb-10 grid max-w-[760px] grid-cols-2 justify-center gap-4 md:flex md:max-w-none md:flex-wrap md:gap-4">
          {SOCIALS.map(({ key, href, Icon }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-w-[130px] flex-col items-center gap-3.5 rounded-[16px] border border-[var(--m-border-soft)] bg-[var(--m-white)] px-12 py-9 text-center shadow-[0_2px_8px_rgba(26,43,51,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--m-border-teal)] hover:bg-[rgba(15,169,160,0.06)] hover:shadow-[0_8px_28px_rgba(15,169,160,0.1)]"
            >
              <Icon size={28} className="text-[var(--m-accent-teal)]" />
              <span className="text-[14px] font-semibold text-[var(--m-ink-primary)]">
                {t(`${key}_label`)}
              </span>
            </a>
          ))}
        </div>

        <p className="text-center">
          <a
            href="#newsletter"
            className="inline-block border-b border-[rgba(15,169,160,0.3)] pb-0.5 text-[14.5px] font-semibold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
          >
            {t('newsletter_link')}
          </a>
        </p>
      </Container>
    </Section>
  );
}
