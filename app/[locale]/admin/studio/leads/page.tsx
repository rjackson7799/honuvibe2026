import { setRequestLocale } from 'next-intl/server';
import { getStudioLeads } from '@/lib/admin/queries';
import { AdminStudioLeadsList } from '@/components/admin/AdminStudioLeadsList';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Studio Leads — Admin',
};

export default async function AdminStudioLeadsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const leads = await getStudioLeads();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div>
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          Studio Leads
        </h1>
        <p className="mt-1 text-sm text-fg-tertiary">
          &ldquo;Start a Project&rdquo; inquiries from studio.honuvibe.ai. Update
          status and notes in Supabase until the Phase 2 intake engine ships.
        </p>
      </div>
      <AdminStudioLeadsList leads={leads} />
    </div>
  );
}
