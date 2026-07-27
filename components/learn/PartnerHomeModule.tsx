import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PartnerIdentity } from '@/components/learn/PartnerIdentity';
import { PartnerCourseCard } from '@/components/learn/PartnerCourseCard';
import type { ActivePartnerContext } from '@/lib/partners/active-partner';
import type { PartnerCatalogResult } from '@/lib/partners/catalog';

type PartnerHomeModuleProps = {
  partner: ActivePartnerContext;
  catalog: PartnerCatalogResult;
  locale: string;
};

/**
 * The partner's home on the member dashboard: identity, then their courses.
 *
 * Branding is scoped to this wrapper rather than applied page-wide. The
 * dashboard runs inside `.learn-zone` (a light-only palette) and ResumeHero sits
 * in `.resume-ocean`, which re-pins `--accent-teal` to #0fa9a0 — a page-wide
 * override would visibly skip the largest element on the page and pour arbitrary
 * partner hex into 13px link text on unaudited surfaces.
 *
 * Hover deliberately reuses the same hex (the join-shell precedent); feedback
 * comes from opacity, not invented colour math. `--accent-gold` is untouched:
 * nothing here uses it.
 */
export async function PartnerHomeModule({ partner, catalog, locale }: PartnerHomeModuleProps) {
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const prefix = locale === 'ja' ? '/ja' : '';

  const brandStyle: CSSProperties = {};
  if (partner.accent) {
    const vars = brandStyle as Record<string, string>;
    vars['--accent-teal'] = partner.accent;
    vars['--accent-teal-hover'] = partner.accent;
    if (partner.accentSubtle) vars['--accent-teal-subtle'] = partner.accentSubtle;
  }

  const labels = {
    continue: t('partner_course_continue'),
    review: t('partner_course_review'),
    view: t('partner_course_view'),
    open: t('partner_course_open'),
  };

  return (
    <section
      style={brandStyle}
      className="rounded-[14px] border border-border-default bg-bg-secondary"
    >
      <div
        className="rounded-t-[14px] border-b border-border-default px-5 py-4"
        style={partner.accentWash ? { backgroundColor: partner.accentWash } : undefined}
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-tertiary">
          {t('partner_home_overline')}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* PartnerIdentity applies the accent itself, so it renders correctly
              both here and in the header where these tokens are not set. */}
          <PartnerIdentity partner={partner} />
          <Link
            href={`${prefix}/learn/dashboard/community`}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-[12.5px] font-medium text-[color:var(--accent-teal)] transition-opacity hover:opacity-90"
          >
            {t('partner_community_cta', { partner: partner.name })}
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="px-5 py-5">
        <h2 className="mb-4 text-[15px] font-bold tracking-[-0.015em] text-fg-primary sm:text-[17px]">
          {t('partner_home_title', { partner: partner.name })}
        </h2>

        {/* Status is checked BEFORE item count: a failed source with zero
            surviving rows must read as a failure, never as coming-soon. */}
        {catalog.status === 'error' ? (
          <p className="text-[13.5px] leading-[1.7] text-fg-secondary">{t('partner_home_error')}</p>
        ) : (
          <>
            {catalog.status === 'partial' && (
              <p className="mb-4 text-[13.5px] leading-[1.7] text-fg-secondary">
                {t('partner_home_partial')}
              </p>
            )}

            {catalog.items.length === 0 ? (
              catalog.status === 'ok' && (
                <p className="text-[13.5px] leading-[1.7] text-fg-secondary">
                  {t('partner_home_empty')}
                </p>
              )
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {catalog.items.map((item) => (
                  <PartnerCourseCard
                    key={item.course.id}
                    item={item}
                    locale={locale}
                    labels={labels}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <Link
          href={`${prefix}/learn`}
          className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-[12.5px] font-medium text-fg-secondary transition-colors hover:text-fg-primary"
        >
          {t('partner_home_browse_all')}
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
