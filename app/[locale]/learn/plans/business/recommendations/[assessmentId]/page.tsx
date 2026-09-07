import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { checkVaultAccess } from '@/lib/vault/access';
import { getBusinessUpgradesEnabled } from '@/lib/business-upgrades/availability';
import { getAssessmentRecommendations } from '@/lib/business-upgrades/queries';
import { BusinessUpgradeRecommendationCards } from '@/components/learn/BusinessUpgradeRecommendationCards';

export default async function RecommendationsPage({ params }: { params: Promise<{ locale: string; assessmentId: string }> }) {
  const { locale, assessmentId } = await params; setRequestLocale(locale);
  const prefix = locale === 'ja' ? '/ja' : '';
  const client = await createClient(); const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(`${prefix}/learn/auth`);
  const [{ data: profile }, enabled, access] = await Promise.all([client.from('users').select('role').eq('id', user.id).maybeSingle(), getBusinessUpgradesEnabled(), checkVaultAccess(user.id)]);
  if ((!enabled && profile?.role !== 'admin') || (!access.hasAccess && profile?.role !== 'admin')) redirect(`${prefix}/learn/plans`);
  const result = await getAssessmentRecommendations(user.id, assessmentId); if (!result) notFound();
  const t = await getTranslations({ locale, namespace: 'business_upgrades' });
  const recommendations = result.recommendations.flatMap((row) => {
    const p = Array.isArray(row.business_upgrade_projects) ? row.business_upgrade_projects[0] : row.business_upgrade_projects;
    if (!p || p.status !== 'published' || p.template_version !== row.project_template_version || new Date(row.expires_at) <= new Date()) return [];
    return [{ projectId: p.id, rank: row.rank, score: row.score, reasons: row.reason_codes, title: locale === 'ja' ? p.title_ja : p.title_en, description: locale === 'ja' ? p.description_ja : p.description_en, outcome: locale === 'ja' ? p.outcome_ja : p.outcome_en, deliverable: locale === 'ja' ? p.deliverable_ja : p.deliverable_en, estimatedDays: p.estimated_days, totalMinutes: p.total_minutes }];
  });
  return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-2xl font-bold text-fg-primary">{t('recommendations_title')}</h1><p className="mt-2 text-sm text-fg-secondary">{t('recommendations_subtitle')}</p></div>{recommendations.length ? <BusinessUpgradeRecommendationCards assessmentId={assessmentId} recommendations={recommendations} /> : <div className="rounded-2xl border border-border-default bg-bg-secondary p-8 text-center"><h2 className="text-xl font-bold text-fg-primary">{t('no_match_title')}</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-fg-secondary">{t('no_match_body')}</p><Link href={`${prefix}/learn/plans`} className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-accent-teal">{t('back_to_plans')}</Link></div>}</div>;
}
