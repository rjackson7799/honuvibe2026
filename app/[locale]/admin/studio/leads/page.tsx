import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Plus } from 'lucide-react';
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
            Studio Leads
          </h1>
          <p className="mt-1 text-sm text-fg-tertiary">
            Create, track, and work Studio leads.
          </p>
        </div>
        <Link
          href="/admin/studio/leads/new"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold shadow-sm hover:shadow-md transition-all"
        >
          <Plus size={16} />
          New Lead
        </Link>
      </div>
      <AdminStudioLeadsList leads={leads} />
    </div>
  );
}
