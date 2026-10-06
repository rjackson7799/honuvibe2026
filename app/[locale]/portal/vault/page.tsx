import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Library, Eye, ThumbsUp } from 'lucide-react';
import { StatCard } from '@/components/admin/StatCard';
import { PartnerPortalLayout } from '@/components/partner-portal/PartnerPortalLayout';
import {
  resolvePartnerScope,
  getPartnerVaultStats,
  getPartnerVaultItems,
} from '@/lib/partner-portal/queries';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ as?: string }>;
};

export default async function PartnerVaultPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { as: previewId } = await searchParams;
  setRequestLocale(locale);

  const scope = await resolvePartnerScope({ locale, previewId });
  if (!scope) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/admin/partners`);
  }

  const { partner, previewMode } = scope;
  const [vaultStats, items] = await Promise.all([
    getPartnerVaultStats(partner.id),
    getPartnerVaultItems(partner.id),
  ]);

  return (
    <PartnerPortalLayout
      partnerName={partner.name_en}
      partnerLogoUrl={partner.logo_url}
      previewMode={previewMode}
    >
      <div className="max-w-[1100px] space-y-8">
        <header>
          <h1 className="font-serif text-3xl text-fg-primary">Vault</h1>
          <p className="mt-1 text-sm text-fg-tertiary">
            Vault content owned by {partner.name_en}.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatCard label="Items owned" value={vaultStats.itemsOwned} icon={Library} />
          <StatCard label="Views (30d)" value={vaultStats.views30d} icon={Eye} />
          <StatCard label="Helpful votes" value={vaultStats.helpfulSum} icon={ThumbsUp} />
        </div>

        {items.length === 0 ? (
          <section className="rounded-lg border border-dashed border-border-default bg-bg-secondary p-8 text-center">
            <h2 className="font-serif text-xl text-fg-primary">No Vault content yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-fg-secondary">
              When HonuVibe tags Vault lessons or series as owned by {partner.name_en}, they&apos;ll
              appear here.
            </p>
          </section>
        ) : (
          <section>
            <h2 className="mb-3 font-serif text-xl text-fg-primary">Items</h2>
            <div className="overflow-hidden rounded-lg border border-border-default bg-bg-secondary">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default text-fg-tertiary">
                    <th className="px-4 py-3 text-left font-medium">Title</th>
                    <th className="px-4 py-3 text-right font-medium">Helpful</th>
                    <th className="px-4 py-3 text-right font-medium">Not helpful</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-b border-border-default last:border-0">
                      <td className="px-4 py-3 text-fg-primary">
                        <Link
                          href={`/${locale === 'ja' ? 'ja/' : ''}learn/vault/${i.slug}`}
                          className="hover:text-accent-teal"
                        >
                          {i.title_en}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-fg-secondary">
                        {i.helpful_count ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right text-fg-secondary">
                        {i.not_helpful_count ?? 0}
                      </td>
                      <td className="px-4 py-3 text-fg-secondary">{i.freshness_status ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </PartnerPortalLayout>
  );
}
