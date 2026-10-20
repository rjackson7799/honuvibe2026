import { useLocale, useTranslations } from 'next-intl';
import { HvBreadcrumb, HvButton, HvContainer, HvHeading } from '@/components/marketing/hv';
import type { CourseCta } from '@/lib/learn/course-cta';
import { formatCourseDate, type CourseDetailView, type CourseFact } from '@/lib/learn/course-detail';
import { CourseCtaButton } from './course-cta-button';
import { CoursePriceCard } from './course-price-card';
import type { CourseDetailT } from './cta-label';

type CourseHeroProps = { view: CourseDetailView; cta: CourseCta; ctaLabel: string };

function factText(fact: CourseFact, t: CourseDetailT, locale: 'en' | 'ja'): { term: string; value: string } {
  switch (fact.key) {
    case 'format':
      return { term: t('facts.format'), value: t(`facts.values.${fact.value}`) };
    case 'length':
      return {
        term: t('facts.length'),
        value:
          fact.hours != null
            ? t('facts.values.length_hours', { modules: fact.modules, hours: fact.hours })
            : fact.weeks != null
              ? t('facts.values.length_weeks', { weeks: fact.weeks })
              : t('facts.values.length_modules', { modules: fact.modules }),
      };
    case 'language':
      return { term: t('facts.language'), value: t(`facts.values.lang_${fact.value}`) };
    case 'starts':
      return { term: t('facts.starts'), value: formatCourseDate(fact.date, locale) };
    case 'community':
      return { term: t('facts.community'), value: t('facts.values.community_months', { months: fact.months }) };
  }
}

/**
 * Design 03 hero (:42-81): breadcrumb, badges, H1, other-language title (D10),
 * description, primary CTA + "Download syllabus", facts <dl> (D5) and the
 * price card. `pt-[108px]` clears the fixed 68px header; the section owns its
 * padding because cn() is plain clsx and HvSection's default md:pt-20 would win.
 */
export function CourseHero({ view, cta, ctaLabel }: CourseHeroProps) {
  const t = useTranslations('course_detail');
  const locale = useLocale() === 'ja' ? 'ja' : 'en';
  const facts = view.facts.map((f) => factText(f, t, locale));

  return (
    <section id="top" className="bg-hv-green-900 pb-16 pt-[108px] text-hv-sand-100">
      <HvContainer className="grid items-start gap-12 [grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr))]">
        <div className="min-w-0">
          <div data-intro>
            <HvBreadcrumb
              items={[
                { label: t('breadcrumb.home'), href: '/' },
                { label: t('breadcrumb.learn'), href: '/learn' },
                { label: view.title },
              ]}
            />
          </div>
          <div data-intro className="mt-[22px] flex flex-wrap items-center gap-2">
            {view.level && (
              <span className="rounded-[7px] bg-hv-amber px-[11px] py-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-hv-green-900">
                {t(`badges.level.${view.level}`)}
              </span>
            )}
            <span className="rounded-[7px] border border-hv-green-700 px-2.5 py-[5px] text-[12px] font-semibold uppercase tracking-[0.08em] text-hv-green-200">
              {t(`badges.format.${view.formatKind}`)}
            </span>
            {view.code && (
              <span className="text-[12.5px] tracking-[0.06em] text-hv-green-400">
                <span className="sr-only">{t('badges.code')} </span>
                {view.code}
              </span>
            )}
            {view.partnerName && (
              <span className="text-[13px] font-medium text-hv-green-200">
                {t('badges.with_partner', { partner: view.partnerName })}
              </span>
            )}
          </div>
          <div data-intro>
            <HvHeading level="h1" className="mt-4 text-hv-sand-100 [word-break:auto-phrase]">
              {view.title}
            </HvHeading>
          </div>
          {view.altTitle && (
            <p data-intro className="mt-3 text-[18px] text-hv-green-400 [word-break:auto-phrase]">
              {view.altTitle}
            </p>
          )}
          {view.description && (
            <p data-intro className="mt-5 max-w-[54ch] text-[17.5px] leading-[1.6] text-hv-green-200 [:lang(ja)_&]:leading-[1.75]">
              {view.description}
            </p>
          )}
          <div data-intro className="mt-7 flex flex-wrap gap-3">
            <CourseCtaButton
              cta={cta}
              label={ctaLabel}
              courseId={view.id}
              slug={view.slug}
              size="hero"
              surface="dark"
            />
            {view.syllabusLocales.length > 0 && (
              <HvButton href="#syllabus" variant="outline-dark" size="hero">
                <span aria-hidden>↓</span>
                {t('syllabus.download')}
              </HvButton>
            )}
          </div>
          {facts.length >= 2 && (
            <dl
              data-intro
              className="mt-9 grid gap-px overflow-hidden rounded-[12px] border border-hv-green-700 bg-hv-green-700 [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]"
            >
              {facts.map((f) => (
                <div key={f.term} className="bg-hv-green-900 px-[18px] py-4">
                  <dt className="text-[12px] uppercase tracking-[0.1em] text-hv-green-400">{f.term}</dt>
                  <dd className="mt-1.5 font-hv-display text-[19px] font-semibold tracking-[-0.01em] text-hv-sand-100">
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <CoursePriceCard view={view} cta={cta} ctaLabel={ctaLabel} />
      </HvContainer>
    </section>
  );
}
