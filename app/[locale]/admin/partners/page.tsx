import { setRequestLocale } from 'next-intl/server';
import { createAdminClient } from '@/lib/supabase/server';
import { AdminPartnerList, type PartnerListRow } from '@/components/admin/AdminPartnerList';

export const metadata = {
  title: 'Partners — Admin',
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminPartnersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createAdminClient();

  const { data: partners, error } = await supabase
    .from('partners')
    .select('id, slug, name_en, logo_url, primary_color, is_public, is_active, revenue_share_pct, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Admin/Partners] list load failed:', error);
  }

  const partnerIds = (partners ?? []).map((p) => p.id);
  let counts: Record<string, number> = {};
  if (partnerIds.length > 0) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('partner_id')
      .in('partner_id', partnerIds);
    counts = (enrollments ?? []).reduce<Record<string, number>>((acc, row) => {
      const pid = row.partner_id as string | null;
      if (pid) acc[pid] = (acc[pid] ?? 0) + 1;
      return acc;
    }, {});
  }

  const rows: PartnerListRow[] = (partners ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name_en: p.name_en,
    logo_url: p.logo_url,
    primary_color: p.primary_color,
    is_public: p.is_public,
    is_active: p.is_active,
    revenue_share_pct: p.revenue_share_pct ?? 0,
    enrollments_count: counts[p.id] ?? 0,
  }));

  return (
    <div className="max-w-[1100px] space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-fg-primary">Partners</h1>
        <span className="text-sm text-fg-tertiary">
          {rows.length} partner{rows.length === 1 ? '' : 's'}
        </span>
      </div>
      <AdminPartnerList partners={rows} />
    </div>
  );
}
