import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { HvContainer } from '@/components/marketing/hv';
import { cn } from '@/lib/utils';

type Props = {
  /** Formatted Studio "from" price (lib/pricing studioFromPrice). */
  price: string;
  showPrice: boolean;
};

const cardBase = cn(
  'flex flex-col overflow-hidden rounded-[16px] transition-[transform,box-shadow] duration-300 ease-hv',
  'hover:-translate-y-[3px] hover:shadow-hv-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber focus-visible:ring-offset-2',
);

/** "More ways to work with us": the Studio (dark) and Partner (sand) image cards. */
export function HomeMoreWays({ price, showPrice }: Props) {
  const t = useTranslations('home.more');

  return (
    <section className="pt-16 md:pt-20">
      <HvContainer>
        <h2 data-reveal className="text-[12px] font-semibold uppercase tracking-[0.12em] text-hv-ink-500">
          {t('label')}
        </h2>
        <div className="mt-3.5 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr))]">
          <Link href="/build" data-reveal className={cn(cardBase, 'bg-hv-green-900 text-hv-sand-100')}>
            <div className="relative aspect-video bg-hv-green-800">
              <Image
                src="/projects/kwame-brathwaite/Card_Kwame.jpg"
                alt={t('build.image_alt')}
                fill
                sizes="(min-width: 1024px) 640px, 100vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col gap-2.5 px-7 pb-7 pt-[26px]">
              <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-hv-amber">{t('build.eyebrow')}</span>
              <h3 className="hv-display font-hv-display text-[28px] font-bold leading-[1.08] tracking-[-0.03em] [text-wrap:balance] [word-break:auto-phrase]">
                {t('build.heading')}
              </h3>
              <p className="max-w-[46ch] text-[15.5px] leading-[1.6] text-hv-green-200">{t('build.body')}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                {showPrice && (
                  <span data-testid="home-more-price" className="text-[14px] text-hv-green-400">
                    {t('build.price', { price })}
                  </span>
                )}
                <span className="font-semibold text-hv-amber">
                  {t('build.cta')} <span aria-hidden>→</span>
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/partner"
            data-reveal
            data-reveal-delay={120}
            className={cn(cardBase, 'bg-hv-sand-200 text-hv-green-900')}
          >
            <div className="relative aspect-video bg-hv-sand-300">
              <Image
                src="/images/honu_hub.jpg"
                alt={t('partner.image_alt')}
                fill
                sizes="(min-width: 1024px) 640px, 100vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col gap-2.5 px-7 pb-7 pt-[26px]">
              <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-hv-terracotta">
                {t('partner.eyebrow')}
              </span>
              <h3 className="hv-display font-hv-display text-[28px] font-bold leading-[1.08] tracking-[-0.03em] [text-wrap:balance] [word-break:auto-phrase]">
                {t('partner.heading')}
              </h3>
              <p className="max-w-[46ch] text-[15.5px] leading-[1.6] text-hv-ink-700">{t('partner.body')}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                <span className="text-[14px] text-hv-ink-500">{t('partner.meta')}</span>
                <span className="font-semibold text-hv-terracotta">
                  {t('partner.cta')} <span aria-hidden>→</span>
                </span>
              </div>
            </div>
          </Link>
        </div>
      </HvContainer>
    </section>
  );
}
