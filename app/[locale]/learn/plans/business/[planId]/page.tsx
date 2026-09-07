import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { checkVaultAccess } from '@/lib/vault/access';
import { getBusinessUpgradesEnabled } from '@/lib/business-upgrades/availability';
import { getBusinessUpgradePlan } from '@/lib/business-upgrades/queries';
import { BusinessUpgradePlanView } from '@/components/learn/BusinessUpgradePlanView';

export default async function BusinessUpgradePlanPage({ params }: { params: Promise<{ locale: string; planId: string }> }) {
  const { locale, planId } = await params; setRequestLocale(locale);
  const prefix = locale === 'ja' ? '/ja' : '';
  const client = await createClient(); const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(`${prefix}/learn/auth`);
  const [{ data: profile }, enabled, access] = await Promise.all([client.from('users').select('role').eq('id', user.id).maybeSingle(), getBusinessUpgradesEnabled(), checkVaultAccess(user.id)]);
  if ((!enabled && profile?.role !== 'admin') || (!access.hasAccess && profile?.role !== 'admin')) redirect(`${prefix}/learn/plans`);
  const plan = await getBusinessUpgradePlan(user.id, planId); if (!plan) notFound();
  return <div className="mx-auto max-w-3xl"><BusinessUpgradePlanView plan={plan} /></div>;
}
