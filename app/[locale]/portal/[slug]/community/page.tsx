import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { ModerationDashboard } from '@/components/admin/community/ModerationDashboard';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function PartnerCommunityModerationPage({
  params,
  searchParams,
}: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { tab } = await searchParams;
  const activeTab =
    tab === 'posts' || tab === 'bans' ? tab : 'reports';

  const supabase = await createClient();

  // Resolve the partner by slug — RLS on partners (partners_self_read +
  // partners_admin_all + partners_public_read for is_active) lets the
  // partner admin see their own row.
  const { data: partner } = await supabase
    .from('partners')
    .select('id, name_en')
    .eq('slug', slug)
    .maybeSingle();

  if (!partner) notFound();

  return (
    <ModerationDashboard
      supabase={supabase}
      partnerId={partner.id as string}
      partnerScopeLabel={partner.name_en as string}
      tab={activeTab}
    />
  );
}
