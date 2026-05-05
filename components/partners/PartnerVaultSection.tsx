import Link from 'next/link';

export type PartnerVaultSeriesCard = {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
  item_count: number;
};

export type PartnerVaultItemCard = {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
};

type Props = {
  partnerName: string;
  series: PartnerVaultSeriesCard[];
  standaloneItems: PartnerVaultItemCard[];
  locale: string;
};

export function PartnerVaultSection({ partnerName, series, standaloneItems, locale }: Props) {
  const prefix = locale === 'ja' ? '/ja' : '';
  if (series.length === 0 && standaloneItems.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="font-serif text-2xl text-fg-primary">Vault content from {partnerName}</h2>
      <p className="mt-2 text-sm text-fg-tertiary">
        Curated lessons available with a HonuVibe Vault subscription.
      </p>

      {series.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => (
            <Link
              key={s.id}
              href={`${prefix}/learn/vault/series/${s.slug}`}
              className="rounded-lg border border-border-default bg-bg-secondary p-4 hover:border-accent-teal"
            >
              <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">
                Series · {s.item_count} lessons
              </div>
              <div className="mt-1 font-medium text-fg-primary">
                {(locale === 'ja' && s.title_jp) || s.title_en}
              </div>
            </Link>
          ))}
        </div>
      )}

      {standaloneItems.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {standaloneItems.map((i) => (
            <Link
              key={i.id}
              href={`${prefix}/learn/vault/${i.slug}`}
              className="rounded-lg border border-border-default bg-bg-secondary p-4 hover:border-accent-teal"
            >
              <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">Lesson</div>
              <div className="mt-1 font-medium text-fg-primary">
                {(locale === 'ja' && i.title_jp) || i.title_en}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
