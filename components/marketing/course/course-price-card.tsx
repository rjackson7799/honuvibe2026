import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { HvButton } from '@/components/marketing/hv';
import type { CourseCta } from '@/lib/learn/course-cta';
import {
  formatCourseDate,
  formatCoursePrice,
  type CourseDetailView,
} from '@/lib/learn/course-detail';
import { CourseCtaButton } from './course-cta-button';

type CoursePriceCardProps = { view: CourseDetailView; cta: CourseCta; ctaLabel: string };

// "{n} spots left" only once the cohort is nearly full (plan D2).
const FEW_SPOTS = 5;

/** Hero aside (design :68-79): course image + one of six access variants (plan D2). */
export function CoursePriceCard({ view, cta, ctaLabel }: CoursePriceCardProps) {
  const t = useTranslations('course_detail.price_card');
  const locale = useLocale() === 'ja' ? 'ja' : 'en';
  const variant = cta.priceCard;

  let eyebrow: string;
  let body: string | null = null;
  let price: { value: string; per: string } | null = null;
  const notes: string[] = [];

  switch (variant) {
    case 'vault_join':
      eyebrow = t('vault_join.eyebrow');
      price = { value: t('vault_join.price'), per: t('vault_join.per') };
      body = t('vault_join.body');
      break;
    case 'vault_member':
      eyebrow = t('vault_member.eyebrow');
      body = t('vault_member.body');
      break;
    case 'enrolled':
      eyebrow = t('enrolled.eyebrow');
      body = t('enrolled.body');
      break;
    case 'free':
      eyebrow = t('free.eyebrow');
      body = t('free.body');
      break;
    case 'contact': {
      const key = view.courseType === '1v1' ? 'one_on_one' : 'other';
      eyebrow = t(`contact.${key}.eyebrow`);
      body = t(`contact.${key}.body`);
      break;
    }
    case 'course_price': {
      eyebrow = t('course_price.eyebrow');
      const value = formatCoursePrice(view.priceUsd, view.priceJpy, locale);
      if (value) price = { value, per: t('course_price.per') };
      if (cta.kind === 'closed') notes.push(t('course_price.closed_note'));
      else if (cta.kind === 'full') notes.push(t('course_price.full_note'));
      else {
        const starts = view.facts.find((f) => f.key === 'starts');
        if (starts) notes.push(t('course_price.starts', { date: formatCourseDate(starts.date, locale) }));
        if (view.spotsLeft != null && view.spotsLeft > 0 && view.spotsLeft <= FEW_SPOTS) {
          notes.push(t('course_price.spots', { n: view.spotsLeft }));
        }
      }
      break;
    }
  }

  const buttonLabel = variant === 'vault_join' ? t('vault_join.button') : ctaLabel;

  return (
    <aside data-intro className="overflow-hidden rounded-[16px] bg-hv-sand-100 text-hv-ink">
      <div className="relative aspect-video bg-hv-green-800">
        {view.imageUrl && (
          <Image
            src={view.imageUrl}
            alt=""
            fill
            priority
            sizes="(min-width:1024px) 560px, 100vw"
            className="object-cover"
          />
        )}
      </div>
      <div className="grid gap-3.5 px-[26px] pb-[26px] pt-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-hv-ink-500">{eyebrow}</p>
        {price && (
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="font-hv-display text-[38px] font-bold leading-none tracking-[-0.03em] text-hv-green-900">
              {price.value}
            </span>
            <span className="text-[15px] text-hv-ink-500">{price.per}</span>
          </p>
        )}
        {body && <p className="text-[15px] leading-[1.55] text-hv-ink-700">{body}</p>}
        {notes.map((note) => (
          <p key={note} className="text-[15px] font-medium leading-[1.5] text-hv-green-900">
            {note}
          </p>
        ))}
        <CourseCtaButton
          cta={cta}
          label={buttonLabel}
          courseId={view.id}
          slug={view.slug}
          tone="dark"
          className="w-full"
        />
        {view.modules.length > 0 && (
          <HvButton href="#curriculum" variant="link" className="justify-self-center text-[15px]">
            {t('see_inside')}
          </HvButton>
        )}
      </div>
    </aside>
  );
}
