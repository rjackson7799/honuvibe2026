import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowRight, MapPin } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';

type Member = {
  key: 'ryan' | 'mizuho' | 'chimi';
  photoSrc: string;
  bg: string;
  photoClassName: string;
  langs: readonly ('en' | 'jp')[];
};

const ALL_MEMBERS: readonly Member[] = [
  {
    key: 'ryan',
    photoSrc: '/images/partners/instructors/ryan.webp',
    bg: 'linear-gradient(145deg, #d4c4a0 0%, #b8a47e 100%)',
    photoClassName: 'object-contain object-center p-1.5',
    langs: ['en'],
  },
  {
    key: 'mizuho',
    photoSrc: '/images/partners/instructors/mizuho.webp',
    bg: 'linear-gradient(145deg, #c4d4c0 0%, #a0b89a 100%)',
    photoClassName: 'object-contain object-center p-1.5',
    langs: ['en', 'jp'],
  },
  {
    key: 'chimi',
    photoSrc: '/images/partners/instructors/chimi.webp',
    bg: 'linear-gradient(145deg, #c4c8d4 0%, #9aa0b8 100%)',
    photoClassName: 'object-contain object-center p-1.5',
    langs: ['en', 'jp'],
  },
];

const MEMBERS: readonly Member[] = ALL_MEMBERS.filter(
  (m) => m.key === 'ryan' || m.key === 'chimi',
);

const CADENCE_KEYS = ['1', '2', '3'] as const;

export function AboutTeam() {
  const t = useTranslations('about.team');

  return (
    <Section id="crew" variant="sand" spacing="default">
      <Container>
        {/* Chapter header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--m-border-soft)] pb-5">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
            {t('chapter_overline')}
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('chapter_meta_right')}
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:gap-16 md:items-end">
          <div className="flex items-start gap-6">
            <span
              className="font-serif italic leading-none text-[var(--m-accent-teal)]"
              style={{ fontSize: 'clamp(56px, 7vw, 88px)' }}
            >
              02
            </span>
            <h2
              className="font-serif italic leading-[0.96] tracking-[-0.02em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(40px, 5.2vw, 68px)' }}
            >
              {t('headline_1')}
              <span className="text-[var(--m-accent-teal)]">.</span>
              <br />
              {t('headline_2')}
              <span className="text-[var(--m-accent-teal)]">.</span>
            </h2>
          </div>

          <p className="max-w-[44ch] text-[16px] leading-[1.7] text-[var(--m-ink-secondary)] md:text-[17px]">
            {t('subhead')}
          </p>
        </div>

        {/* Portrait grid */}
        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 items-start gap-6 md:mt-16 md:grid-cols-2 md:gap-8">
          {MEMBERS.map((m) => (
            <TeamCard key={m.key} member={m} />
          ))}
        </div>

        {/* Cadence row */}
        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-5 border-t border-[var(--m-border-soft)] pt-7 sm:grid-cols-3">
          {CADENCE_KEYS.map((k) => (
            <div key={k}>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
                {t(`cadence_stat_${k}_label`)}
              </p>
              <p className="mt-1.5 text-[15px] font-bold leading-snug text-[var(--m-ink-primary)]">
                {t(`cadence_stat_${k}_value`)}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mx-auto mt-8 max-w-3xl">
          <a
            href="/learn"
            className="inline-flex items-center gap-2 text-[15.5px] font-bold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
          >
            {t('cta_label')}
            <ArrowRight size={15} strokeWidth={2} />
          </a>
        </div>
      </Container>
    </Section>
  );
}

function TeamCard({ member }: { member: Member }) {
  const t = useTranslations('about.team');

  return (
    <div className="overflow-hidden rounded-[20px] bg-[var(--m-white)] shadow-[0_4px_20px_rgba(26,43,51,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(26,43,51,0.1)]">
      <div
        className="relative mx-5 mt-5 h-[160px] overflow-hidden rounded-[16px] md:mx-6 md:mt-6 md:h-[180px]"
        style={{ background: member.bg }}
      >
        <Image
          src={member.photoSrc}
          alt={t(`members_${member.key}_photo_alt`)}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className={member.photoClassName}
        />
      </div>
      <div className="px-6 pb-7 pt-5 md:px-7 md:pb-8 md:pt-5">
        <h3 className="mb-1 text-[18px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
          {t(`members_${member.key}_name`)}
        </h3>
        <p className="mb-2.5 text-[13.5px] font-semibold text-[var(--m-accent-teal)]">
          {t(`members_${member.key}_title`)}
        </p>
        <div className="mb-5 flex items-center gap-1.5 text-[var(--m-ink-tertiary)]">
          <MapPin size={14} strokeWidth={1.6} aria-hidden />
          <span className="text-[12.5px]">
            {t(`members_${member.key}_location`)}
          </span>
        </div>
        <p className="mb-6 text-[14px] leading-[1.72] text-[var(--m-ink-secondary)]">
          {t(`members_${member.key}_bio`)}
        </p>
        <div className="flex flex-wrap gap-2">
          {member.langs.map((lang, i) => (
            <span
              key={lang}
              className={
                'rounded-full px-3 py-1 text-[12px] font-bold ' +
                (i === 0
                  ? 'bg-[rgba(15,169,160,0.1)] text-[var(--m-accent-teal)]'
                  : 'bg-[var(--m-accent-coral-soft)] text-[var(--m-accent-coral)]')
              }
            >
              {lang === 'en' ? 'EN' : '日本語'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
