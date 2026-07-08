import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getStudioLeadById } from '@/lib/admin/queries';
import { AdminStudioLeadForm } from '@/components/admin/AdminStudioLeadForm';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  if (id === 'new') return { title: 'New Lead — Admin' };
  const lead = await getStudioLeadById(id);
  return {
    title: lead ? `${lead.company} — Studio Lead` : 'Lead Not Found',
  };
}

export default async function AdminStudioLeadPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (id === 'new') {
    return <AdminStudioLeadForm lead={null} />;
  }

  const lead = await getStudioLeadById(id);
  if (!lead) notFound();

  return <AdminStudioLeadForm lead={lead} />;
}
