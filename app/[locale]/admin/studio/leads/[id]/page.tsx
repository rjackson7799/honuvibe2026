import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getEngagementForLead, getStudioLeadById } from '@/lib/admin/queries';
import { AdminStudioLeadForm } from '@/components/admin/AdminStudioLeadForm';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  if (id === 'new') return { title: 'New Lead — Admin' };
  if (!UUID_RE.test(id)) return { title: 'Lead Not Found' };
  const lead = await getStudioLeadById(id);
  return {
    title: lead ? `${lead.company} — Studio Lead` : 'Lead Not Found',
  };
}

export default async function AdminStudioLeadPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (id === 'new') {
    return <AdminStudioLeadForm lead={null} engagement={null} />;
  }

  // getStudioLeadById swallows a bad-uuid error into null (→ 404), but
  // getEngagementForLead throws on query errors by design — so reject a
  // non-uuid id before either query runs.
  if (!UUID_RE.test(id)) notFound();

  // The engagement (067) rides along: when one exists it owns the lead's
  // sales stage, and the form renders a frozen badge instead of the select.
  const [lead, engagement] = await Promise.all([getStudioLeadById(id), getEngagementForLead(id)]);
  if (!lead) notFound();

  return <AdminStudioLeadForm lead={lead} engagement={engagement} />;
}
