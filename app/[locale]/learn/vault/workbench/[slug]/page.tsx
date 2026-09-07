import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { checkVaultAccess } from '@/lib/vault/access';
import {
  getPublishedScenarioBySlug,
  getAttemptsForScenario,
  getTodayUsage,
} from '@/lib/workbench/queries';
import {
  getAvailableExecutorModels,
  WORKBENCH_DAILY_CAPS,
} from '@/lib/workbench/models';
import { WorkbenchWorkspace } from '@/components/workbench/WorkbenchWorkspace';
import { VaultPremiumGate } from '@/components/vault/VaultPremiumGate';
import type {
  WorkbenchExpertContent,
  WorkbenchUsage,
  WorkbenchWorkspaceScenario,
} from '@/lib/workbench/types';
import { isBusinessUpgradeWorkbenchContext } from '@/lib/business-upgrades/queries';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ plan?: string; step?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const scenario = await getPublishedScenarioBySlug(slug);
  return {
    title: scenario ? `${scenario.title_en} — Workbench` : 'Workbench',
  };
}

export default async function WorkbenchWorkspacePage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const context = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasAccess = false;
  if (user) {
    const access = await checkVaultAccess(user.id);
    hasAccess = access.hasAccess;
  }

  if (!hasAccess) {
    return (
      <div className="max-w-[1100px] mx-auto">
        <VaultPremiumGate />
      </div>
    );
  }

  const scenario = await getPublishedScenarioBySlug(slug);
  if (!scenario) notFound();

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const hasPlanContext = !!user && !!context.plan && !!context.step && uuidPattern.test(context.plan) && uuidPattern.test(context.step)
    ? await isBusinessUpgradeWorkbenchContext(user.id, context.plan, context.step, scenario.id)
    : false;

  const [attempts, usageRaw] = await Promise.all([
    getAttemptsForScenario(scenario.id),
    getTodayUsage(),
  ]);
  const availableModels = getAvailableExecutorModels();

  // Expert content is sent to the client only once the member has revealed it
  // (any attempt with expert_revealed_at) — the reveal gate. Otherwise null.
  const revealed = attempts.some((a) => a.expert_revealed_at != null);
  const expert: WorkbenchExpertContent | null = revealed
    ? {
        expert_prompt_en: scenario.expert_prompt_en,
        expert_prompt_jp: scenario.expert_prompt_jp,
        expert_output_en: scenario.expert_output_en,
        expert_output_jp: scenario.expert_output_jp,
        why_this_works_en: scenario.why_this_works_en,
        why_this_works_jp: scenario.why_this_works_jp,
      }
    : null;

  // Strip expert fields from the scenario passed to the client (gate).
  const clientScenario: WorkbenchWorkspaceScenario = {
    id: scenario.id,
    slug: scenario.slug,
    title_en: scenario.title_en,
    title_jp: scenario.title_jp,
    domain: scenario.domain,
    difficulty: scenario.difficulty,
    brief_en: scenario.brief_en,
    brief_jp: scenario.brief_jp,
    applicable_dimensions: scenario.applicable_dimensions,
  };

  const usage: WorkbenchUsage = {
    runs: { used: usageRaw.runs, cap: WORKBENCH_DAILY_CAPS.runs },
    scores: { used: usageRaw.scores, cap: WORKBENCH_DAILY_CAPS.scores },
  };

  const tUpgrades = await getTranslations({ locale, namespace: 'business_upgrades' });
  const prefix = locale === 'ja' ? '/ja' : '';
  return (
    <div className="space-y-4">
      {hasPlanContext && <Link href={`${prefix}/learn/plans/business/${context.plan}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-accent-teal">← {tUpgrades('return_to_plan')}</Link>}
      <WorkbenchWorkspace
      scenario={clientScenario}
      initialAttempts={attempts}
      availableModels={availableModels}
      initialUsage={usage}
      initialExpert={expert}
      />
    </div>
  );
}
