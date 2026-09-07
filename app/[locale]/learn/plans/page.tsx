import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Route, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { checkVaultAccess } from '@/lib/vault/access';
import { getBusinessUpgradesEnabled } from '@/lib/business-upgrades/availability';
import { listBusinessUpgradePlans } from '@/lib/business-upgrades/queries';
import { getUserPaths } from '@/lib/paths/queries';
import { DashboardPageHeader } from '@/components/learn/DashboardPageHeader';
import { BusinessUpgradeGate } from '@/components/learn/BusinessUpgradeGate';
import { BusinessUpgradePlanCard } from '@/components/learn/BusinessUpgradePlanCard';
import { PathCard } from '@/components/learn/PathCard';

export default async function PlansPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const prefix = locale === 'ja' ? '/ja' : '';
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(`${prefix}/learn/auth?redirect=${encodeURIComponent(`${prefix}/learn/plans`)}`);
  const [{ data: profile }, enabled, access, paths] = await Promise.all([
    client.from('users').select('role').eq('id', user.id).maybeSingle(),
    getBusinessUpgradesEnabled(),
    checkVaultAccess(user.id),
    getUserPaths(user.id).catch(() => []),
  ]);
  const available = enabled || profile?.role === 'admin';
  const plans = available && (access.hasAccess || profile?.role === 'admin') ? await listBusinessUpgradePlans(user.id).catch(() => []) : [];
  const t = await getTranslations({ locale, namespace: 'business_upgrades' });
  const tPaths = await getTranslations({ locale, namespace: 'study_paths' });
  const labels = { active: t('active'), completed: t('completed'), archived: t('archived'), progress: (completed: number, total: number) => t('progress', { completed, total }), continue: t('continue'), view: t('view') };

  return <div className="max-w-[920px] space-y-10">
    <DashboardPageHeader icon={Route} title={t('page_title')} subtitle={t('page_subtitle')} />
    {available && <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-fg-primary">{t('section_title')}</h2><p className="mt-1 text-sm text-fg-secondary">{t('section_subtitle')}</p></div>{(access.hasAccess || profile?.role === 'admin') && <Link href={`${prefix}/learn/plans/business/new`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent-teal px-4 py-2 text-sm font-semibold text-white"><Sparkles size={16} />{t('new_plan')}</Link>}</div>
      {access.hasAccess || profile?.role === 'admin' ? plans.length > 0 ? <div className="grid gap-4 sm:grid-cols-2">{plans.map((plan) => <BusinessUpgradePlanCard key={plan.id} plan={plan} locale={locale} labels={labels} />)}</div> : <div className="rounded-2xl border border-dashed border-border-default bg-bg-secondary p-8 text-center"><h3 className="font-bold text-fg-primary">{t('empty_title')}</h3><p className="mt-2 text-sm text-fg-secondary">{t('empty_body')}</p></div> : <BusinessUpgradeGate locale={locale} />}
    </section>}
    <section className="space-y-4"><div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-fg-primary">{t('study_paths_title')}</h2><p className="mt-1 text-sm text-fg-secondary">{t('study_paths_subtitle')}</p></div><Link href={`${prefix}/learn/paths/new`} className="text-sm font-semibold text-accent-teal">{tPaths('create_new')}</Link></div>{paths.length ? <div className="grid gap-4 sm:grid-cols-2">{paths.map((path) => <PathCard key={path.id} path={path} />)}</div> : <div className="rounded-xl border border-dashed border-border-default p-6 text-center text-sm text-fg-secondary">{tPaths('no_paths')}</div>}</section>
  </div>;
}
