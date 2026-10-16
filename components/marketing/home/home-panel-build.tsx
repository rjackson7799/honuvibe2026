import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { HvButton, HvHeading } from '@/components/marketing/hv';

type Props = {
  /** Formatted Studio "from" price (lib/pricing studioFromPrice). */
  price: string;
  showPrice: boolean;
};

type BuildType = { name: string; note: string };

/** Tab 02: the Studio offer — image, the four things we build, and the brief CTA. */
export function HomePanelBuild({ price, showPrice }: Props) {
  const t = useTranslations('home.panel_build');
  const types = t.raw('types') as BuildType[];

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-hv-terracotta">{t('eyebrow')}</span>
        {showPrice && (
          <span data-testid="home-build-price" className="text-[13.5px] text-hv-ink-500">
            {t('price', { price })}
          </span>
        )}
      </div>
      <HvHeading level="panel" className="text-hv-green-900 [word-break:auto-phrase]">
        {t('heading')}
      </HvHeading>
      <div className="relative h-[190px] overflow-hidden rounded-[12px] bg-hv-sand-200">
        <Image
          src="/projects/hci-medical/Card_HCI.jpg"
          alt={t('image_alt')}
          fill
          sizes="(min-width: 1024px) 600px, 100vw"
          className="object-cover"
        />
      </div>
      <ul className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]">
        {types.map((type) => (
          <li key={type.name} className="rounded-[10px] border border-hv-sand-300 bg-hv-sand-50 p-3">
            <span className="block text-[15px] font-semibold text-hv-green-900">{type.name}</span>
            <span className="mt-[3px] block text-[13px] text-hv-ink-500">{type.note}</span>
          </li>
        ))}
      </ul>
      <HvButton href="/build" variant="dark" size="md" arrow className="self-start">
        {t('cta')}
      </HvButton>
    </div>
  );
}
