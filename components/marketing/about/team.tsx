import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { MapPin } from 'lucide-react';
import {
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';

type Member = {
  key: 'ryan' | 'mizuho' | 'chimi';
  photoSrc: string;
  bg: string;
  langs: readonly ('en' | 'jp')[];
};

const MEMBERS: readonly Member[] = [
  {
    key: 'ryan',
    photoSrc: '/images/partners/instructors/ryan.webp',
    bg: 'linear-gradient(145deg, #d4c4a0 0%, #b8a47e 100%)',
    langs: ['en'],
  },
  {
    key: 'mizuho',
    photoSrc: '/images/partners/instructors/mizuho.webp',
    bg: 'linear-gradient(145deg, #c4d4c0 0%, #a0b89a 100%)',
    langs: ['en', 'jp'],
  },
  {
    key: 'chimi',
    photoSrc: '/images/partners/instructors/chimi.webp',
    bg: 'linear-gradient(145deg, #c4c8d4 0%, #9aa0b8 100%)',
    langs: ['en', 'jp'],
  },
];

export function AboutTeam() {
  const t = useTranslations('about.team');

  return (
    <Section variant="sand">
      <Container>
        <div className="mb-12 flex flex-col items-start justify-between gap-6 md:mb-16 md:flex-row md:items-end">
          <div>
            <Overline tone="teal" className="mb-3.5">
              {t('overline')}
            </Overline>
            <SectionHeading>
              {t('headline_line_1')}
              <br />
              {t('headline_line_2')}
            </SectionHeading>
          </div>
          <p className="max-w-[340px] text-[15.5px] leading-[1.65] text-[var(--m-ink-secondary)] md:pb-1 md:text-right">
            {t('subhead')}
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
          {MEMBERS.map((m) => (
            <TeamCard key={m.key} member={m} />
          ))}
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
        className="relative h-[220px] overflow-hidden"
        style={{ background: member.bg }}
      >
        <Image
          src={member.photoSrc}
          alt={t(`members_${member.key}_photo_alt`)}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
      </div>
      <div className="px-7 pb-8 pt-7">
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
