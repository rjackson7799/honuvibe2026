import { getTranslations } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { HvButton, HvContainer, HvHeading } from '@/components/marketing/hv';

/**
 * Unknown course slug (and /learn/account, which has no route). /learn/<slug>
 * is a marketing path, so the legacy dark Nav yields here; this page brings
 * the green header and footer itself.
 */
export default async function CourseNotFound() {
  const t = await getTranslations('course_detail.not_found');

  return (
    <MarketingShell theme="hv">
      <MarketingNav />
      <main>
        <section className="bg-hv-green-900 pb-20 pt-[132px] text-hv-sand-100">
          <HvContainer className="max-w-[880px]">
            <HvHeading level="h1" className="text-hv-sand-100 [word-break:auto-phrase]">
              {t('title')}
            </HvHeading>
            <p className="mt-4 max-w-[52ch] text-[17px] leading-[1.6] text-hv-green-200">{t('body')}</p>
            <HvButton href="/learn" variant="amber" size="hero" className="mt-8" arrow>
              {t('cta')}
            </HvButton>
          </HvContainer>
        </section>
      </main>
      <MarketingFooter />
    </MarketingShell>
  );
}
