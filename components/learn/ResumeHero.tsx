import Link from 'next/link';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ResumePoint } from '@/lib/progress/queries';

type ResumeHeroProps = {
  /** null means the resume query failed — render the error state, never "start". */
  resume: ResumePoint | null;
  locale: string;
  lessonsThisWeek: number | null;
  vaultSaves: number | null;
  /** Suppress the primary CTA when NextSessionCard already offers this session. */
  suppressCta?: boolean;
};

function Band({ children }: { children: React.ReactNode }) {
  return (
    <section className="resume-ocean rounded-[16px] px-5 py-6 sm:px-7 sm:py-8">
      {children}
    </section>
  );
}

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-teal)] mb-2.5">
      {children}
    </p>
  );
}

/** The "this week" rail. Hidden entirely rather than showing a fabricated 0. */
function WeekRail({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  if (items.length === 0) return null;

  return (
    <dl className="flex gap-6 sm:gap-7 shrink-0">
      {items.map((item) => (
        <div key={item.label}>
          <dd className="text-[26px] leading-none font-semibold text-fg-primary tabular-nums">
            {item.value}
          </dd>
          <dt className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-fg-tertiary">
            {item.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}

/**
 * The dashboard's single primary action: the lesson to open next.
 *
 * Never hidden. Every state — including failure — renders something honest, and
 * a failed resume query is NOT allowed to degrade into "start your first course",
 * which would tell a paying student they have no courses.
 */
export async function ResumeHero({
  resume,
  locale,
  lessonsThisWeek,
  vaultSaves,
  suppressCta = false,
}: ResumeHeroProps) {
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const prefix = locale === 'ja' ? '/ja' : '';

  // Counts are omitted rather than zeroed when their query failed: a fabricated
  // "0" is indistinguishable from having genuinely done nothing this week.
  const rail = [
    ...(lessonsThisWeek !== null
      ? [{ label: t('this_week_lessons'), value: lessonsThisWeek }]
      : []),
    ...(vaultSaves !== null ? [{ label: t('this_week_saves'), value: vaultSaves }] : []),
  ];

  if (resume === null) {
    return (
      <Band>
        <Overline>{t('resume_overline')}</Overline>
        <h2 className="font-[family-name:var(--font-dm-serif)] text-[26px] sm:text-[30px] leading-tight text-fg-primary">
          {t('resume_error_title')}
        </h2>
        <p className="mt-2 text-sm text-fg-secondary max-w-[52ch]">
          {t('resume_error_body')}
        </p>
        <Link
          href={`${prefix}/learn/dashboard`}
          className="mt-5 inline-flex items-center gap-2 min-h-[44px] px-5 rounded-[10px] bg-[color:var(--accent-teal)] text-[#04211f] text-sm font-semibold hover:bg-[color:var(--accent-teal-hover)] transition-colors"
        >
          <RefreshCw size={15} aria-hidden="true" />
          {t('resume_retry')}
        </Link>
      </Band>
    );
  }

  if (resume.kind === 'none') {
    return (
      <Band>
        <Overline>{t('resume_overline')}</Overline>
        <h2 className="font-[family-name:var(--font-dm-serif)] text-[26px] sm:text-[30px] leading-tight text-fg-primary">
          {t('resume_none_title')}
        </h2>
        <p className="mt-2 text-sm text-fg-secondary max-w-[52ch]">{t('resume_none_body')}</p>
        <Link
          href={`${prefix}/learn`}
          className="mt-5 inline-flex items-center gap-2 min-h-[44px] px-5 rounded-[10px] bg-[color:var(--accent-teal)] text-[#04211f] text-sm font-semibold hover:bg-[color:var(--accent-teal-hover)] transition-colors"
        >
          {t('resume_none_cta')}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </Band>
    );
  }

  const courseTitle =
    locale === 'ja' && resume.course.title_jp ? resume.course.title_jp : resume.course.title_en;
  const courseHref = `${prefix}/learn/dashboard/${resume.course.slug}`;

  if (resume.kind === 'completed' || resume.kind === 'caught_up') {
    const isDone = resume.kind === 'completed';
    return (
      <Band>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="min-w-0">
            <Overline>{isDone ? t('resume_finished_overline') : t('resume_caught_up_overline')}</Overline>
            <h2 className="font-[family-name:var(--font-dm-serif)] text-[26px] sm:text-[30px] leading-tight text-fg-primary">
              {isDone
                ? t('resume_finished_title', { course: courseTitle })
                : t('resume_caught_up_title', { course: courseTitle })}
            </h2>
            <p className="mt-2 text-sm text-fg-secondary max-w-[52ch]">
              {isDone ? t('resume_finished_body') : t('resume_caught_up_body')}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={isDone ? `${prefix}/learn` : courseHref}
                className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-[10px] bg-[color:var(--accent-teal)] text-[#04211f] text-sm font-semibold hover:bg-[color:var(--accent-teal-hover)] transition-colors"
              >
                {isDone ? t('resume_finished_cta') : t('resume_open_course')}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              {isDone && (
                <Link
                  href={courseHref}
                  className="inline-flex items-center min-h-[44px] px-4 text-sm font-medium text-fg-secondary hover:text-fg-primary transition-colors"
                >
                  {t('resume_open_course')}
                </Link>
              )}
            </div>
          </div>
          <WeekRail items={rail} />
        </div>
      </Band>
    );
  }

  // kind === 'resume'
  const sessionTitle =
    locale === 'ja' && resume.session.title_jp
      ? resume.session.title_jp
      : resume.session.title_en;
  const duration = resume.session.duration_minutes;

  return (
    <Band>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="min-w-0">
          <Overline>
            {t('resume_lesson_of', { index: resume.index, total: resume.total })}
          </Overline>
          <h2 className="font-[family-name:var(--font-dm-serif)] text-[26px] sm:text-[30px] leading-tight text-fg-primary">
            {courseTitle}
          </h2>
          <p className="mt-2 text-sm text-fg-secondary max-w-[52ch]">
            {duration
              ? t('resume_up_next_duration', { title: sessionTitle, minutes: duration })
              : t('resume_up_next', { title: sessionTitle })}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {/* Suppress only the PRIMARY resume link when NextSessionCard above
                already offers this exact session — "Open course" is not a
                duplicate, so it always stays. */}
            {!suppressCta && (
              <Link
                href={`${courseHref}?session=${resume.session.id}`}
                className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-[10px] bg-[color:var(--accent-teal)] text-[#04211f] text-sm font-semibold hover:bg-[color:var(--accent-teal-hover)] transition-colors"
              >
                {resume.index === 1 ? t('resume_start_cta') : t('resume_cta')}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )}
            <Link
              href={courseHref}
              className={
                suppressCta
                  ? 'inline-flex items-center gap-2 min-h-[44px] px-5 rounded-[10px] bg-[color:var(--accent-teal)] text-[#04211f] text-sm font-semibold hover:bg-[color:var(--accent-teal-hover)] transition-colors'
                  : 'inline-flex items-center min-h-[44px] px-4 text-sm font-medium text-fg-secondary hover:text-fg-primary transition-colors'
              }
            >
              {t('resume_open_course')}
              {suppressCta && <ArrowRight size={15} aria-hidden="true" />}
            </Link>
          </div>
        </div>
        <WeekRail items={rail} />
      </div>
    </Band>
  );
}
