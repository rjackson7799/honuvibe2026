import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { checkVaultAccess } from '@/lib/vault/access';
import { getBusinessUpgradesEnabled } from '@/lib/business-upgrades/availability';
import { BusinessUpgradeAssessmentWizard } from '@/components/learn/BusinessUpgradeAssessmentWizard';

export default async function NewBusinessUpgradePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const prefix = locale === 'ja' ? '/ja' : '';
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(`${prefix}/learn/auth?redirect=${encodeURIComponent(`${prefix}/learn/plans/business/new`)}`);
  const [{ data: profile }, enabled, access] = await Promise.all([client.from('users').select('role').eq('id', user.id).maybeSingle(), getBusinessUpgradesEnabled(), checkVaultAccess(user.id)]);
  if ((!enabled && profile?.role !== 'admin') || (!access.hasAccess && profile?.role !== 'admin')) redirect(`${prefix}/learn/plans`);
  return <div className="mx-auto max-w-2xl"><BusinessUpgradeAssessmentWizard /></div>;
}
