import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getVaultItemById, getVaultTags, getVaultAdminSeriesList, getVaultDownloads, getVaultItemPickerList } from '@/lib/vault/queries';
import { getAdminCourses } from '@/lib/courses/queries';
import { createAdminClient } from '@/lib/supabase/server';
import { AdminVaultDetail } from '@/components/admin/AdminVaultDetail';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  if (id === 'new') return { title: 'New Content — Admin' };

  const item = await getVaultItemById(id);
  return { title: item ? `${item.title_en} — Admin` : 'Content Not Found' };
}

export default async function AdminVaultDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const adminClient = createAdminClient();
  const [tags, series, courses, allItems, { data: partners }] = await Promise.all([
    getVaultTags(),
    getVaultAdminSeriesList(),
    getAdminCourses(),
    getVaultItemPickerList(),
    adminClient
      .from('partners')
      .select('id, slug, name_en, logo_url, revenue_share_pct')
      .eq('is_active', true)
      .order('name_en'),
  ]);

  const seriesOptions = series.map((s) => ({ id: s.id, title: s.title_en, partner_id: s.partner_id ?? null }));
  const courseOptions = courses.map((c) => ({ id: c.id, title: c.title_en }));

  if (id === 'new') {
    return (
      <AdminVaultDetail
        item={null}
        tags={tags}
        seriesOptions={seriesOptions}
        courseOptions={courseOptions}
        allItems={allItems}
        partners={partners ?? []}
      />
    );
  }

  const item = await getVaultItemById(id);
  if (!item) notFound();

  const downloads = await getVaultDownloads(item.id);

  return (
    <AdminVaultDetail
      item={item}
      tags={tags}
      seriesOptions={seriesOptions}
      courseOptions={courseOptions}
      downloads={downloads}
      allItems={allItems}
      partners={partners ?? []}
    />
  );
}
