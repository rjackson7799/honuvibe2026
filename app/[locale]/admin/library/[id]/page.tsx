import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAdminLibraryVideoById } from '@/lib/library/queries';
import { getAdminCourses } from '@/lib/courses/queries';
import { AdminLibraryDetail } from '@/components/admin/AdminLibraryDetail';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  if (id === 'new') return { title: 'New Video — Admin' };

  const video = await getAdminLibraryVideoById(id);
  return { title: video ? `${video.title_en} — Admin` : 'Video Not Found' };
}

export default async function AdminLibraryDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const courses = await getAdminCourses();
  const courseOptions = courses.map((c) => ({ id: c.id, title: c.title_en }));

  if (id === 'new') {
    return <AdminLibraryDetail video={null} courseOptions={courseOptions} />;
  }

  const video = await getAdminLibraryVideoById(id);
  if (!video) notFound();

  return <AdminLibraryDetail video={video} courseOptions={courseOptions} />;
}
