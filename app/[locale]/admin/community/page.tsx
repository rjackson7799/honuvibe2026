import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { ModerationDashboard } from '@/components/admin/community/ModerationDashboard';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminCommunityPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { tab } = await searchParams;
  const activeTab =
    tab === 'posts' || tab === 'bans' ? tab : 'reports';

  const supabase = await createClient();

  // partnerId undefined = all scopes (admin sees everything via cma_admin_all)
  return (
    <ModerationDashboard
      supabase={supabase}
      partnerId={undefined}
      partnerScopeLabel="All communities"
      tab={activeTab}
    />
  );
}
