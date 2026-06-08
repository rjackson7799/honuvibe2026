import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
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

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const scenario = await getPublishedScenarioBySlug(slug);
  return {
    title: scenario ? `${scenario.title_en} — Workbench` : 'Workbench',
  };
}

export default async function WorkbenchWorkspacePage({ params }: Props) {
  const { locale, slug } = await params;
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

  return (
    <WorkbenchWorkspace
      scenario={clientScenario}
      initialAttempts={attempts}
      availableModels={availableModels}
      initialUsage={usage}
      initialExpert={expert}
    />
  );
}
