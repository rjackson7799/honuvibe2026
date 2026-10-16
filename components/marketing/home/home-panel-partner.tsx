import { useTranslations } from 'next-intl';
import { HvButton, HvHeading } from '@/components/marketing/hv';

type PartnerCard = { name: string; body: string };

/** Tab 03: the partner program for businesses and online communities. */
export function HomePanelPartner() {
  const t = useTranslations('home.panel_partner');
  const cards = t.raw('cards') as PartnerCard[];

  return (
    <div className="flex flex-col gap-3.5">
      <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-hv-terracotta">{t('eyebrow')}</span>
      <HvHeading level="panel" className="text-hv-green-900 [word-break:auto-phrase]">
        {t('heading')}
      </HvHeading>
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        {cards.map((card) => (
          <div
            key={card.name}
            className="flex flex-col gap-1.5 rounded-[12px] border border-hv-sand-300 bg-hv-sand-50 p-[18px]"
          >
            <h3 className="hv-display font-hv-display text-[19px] font-bold tracking-[-0.02em] text-hv-green-900">
              {card.name}
            </h3>
            <p className="text-[14.5px] leading-[1.55] text-hv-ink-700">{card.body}</p>
          </div>
        ))}
      </div>
      <p className="rounded-[12px] bg-hv-sand-200 px-4 py-3.5 text-[14.5px] leading-[1.55] text-hv-ink-700">{t('note')}</p>
      <HvButton href="/partner" variant="dark" size="md" arrow className="self-start">
        {t('cta')}
      </HvButton>
    </div>
  );
}
