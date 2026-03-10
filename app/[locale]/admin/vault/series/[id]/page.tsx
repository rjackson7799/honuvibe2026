import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import {
  getVaultSeriesById,
  getVaultSeriesItemsAdmin,
  getVaultTags,
  getVaultAdminItems,
} from '@/lib/vault/queries';
import { AdminVaultSeriesDetail } from '@/components/admin/AdminVaultSeriesDetail';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  if (id === 'new') return { title: 'New Series — Admin' };

  const series = await getVaultSeriesById(id);
  return { title: series ? `${series.title_en} — Admin` : 'Series Not Found' };
}

export default async function AdminVaultSeriesDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const tags = await getVaultTags();

  if (id === 'new') {
    const allItems = await getVaultAdminItems({});
    return (
      <AdminVaultSeriesDetail
        series={null}
        tags={tags}
        allItems={allItems}
        seriesItems={[]}
      />
    );
  }

  const [series, seriesItems, allItems] = await Promise.all([
    getVaultSeriesById(id),
    getVaultSeriesItemsAdmin(id),
    getVaultAdminItems({}),
  ]);

  if (!series) notFound();

  return (
    <AdminVaultSeriesDetail
      series={series}
      tags={tags}
      allItems={allItems}
      seriesItems={seriesItems}
    />
  );
}
