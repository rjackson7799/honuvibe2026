import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getVaultItemById, getVaultTags, getVaultAdminSeriesList, getVaultDownloads, getVaultItemPickerList } from '@/lib/vault/queries';
import { getAdminCourses } from '@/lib/courses/queries';
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

  const [tags, series, courses, allItems] = await Promise.all([
    getVaultTags(),
    getVaultAdminSeriesList(),
    getAdminCourses(),
    getVaultItemPickerList(),
  ]);

  const seriesOptions = series.map((s) => ({ id: s.id, title: s.title_en }));
  const courseOptions = courses.map((c) => ({ id: c.id, title: c.title_en }));

  if (id === 'new') {
    return (
      <AdminVaultDetail
        item={null}
        tags={tags}
        seriesOptions={seriesOptions}
        courseOptions={courseOptions}
        allItems={allItems}
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
    />
  );
}
