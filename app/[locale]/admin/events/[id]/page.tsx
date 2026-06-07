import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAdminEventById } from '@/lib/events/queries';
import { AdminEventDetail } from '@/components/admin/AdminEventDetail';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  if (id === 'new') return { title: 'New Event — Admin' };
  const detail = await getAdminEventById(id);
  return { title: detail ? `${detail.event.title_en} — Admin` : 'Event Not Found' };
}

export default async function AdminEventDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (id === 'new') {
    return <AdminEventDetail detail={null} />;
  }

  const detail = await getAdminEventById(id);
  if (!detail) notFound();

  return <AdminEventDetail detail={detail} />;
}
