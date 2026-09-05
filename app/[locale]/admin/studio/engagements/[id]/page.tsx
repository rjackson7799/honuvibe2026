import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getEngagementById, getEngagementEvents, getEngagementQuestionnaire, getLatestEngagementBrief } from '@/lib/admin/queries';
import { createAdminClient } from '@/lib/supabase/server';
import { STAGE_LABELS } from '@/lib/studio/engagement/stages';
import { formatShortDate } from '@/lib/studio/engagement/format';
import { flipStaleTailoring } from '@/lib/studio/engagement/tailor';
import { flipStaleBriefs } from '@/lib/studio/engagement/brief';
import { isAnswerPresent } from '@/lib/studio/engagement/validate-answers';
import { EngagementStageControl } from '@/components/admin/EngagementStageControl';
import { EngagementContactCard } from '@/components/admin/EngagementContactCard';
import { EngagementDiscoveryPanel } from '@/components/admin/EngagementDiscoveryPanel';
import { EngagementAnswersView } from '@/components/admin/EngagementAnswersView';
import { EngagementBriefPanel } from '@/components/admin/EngagementBriefPanel';
import { EngagementTimeline } from '@/components/admin/EngagementTimeline';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  ai_native: 'AI-native',
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const engagement = UUID_RE.test(id) ? await getEngagementById(id) : null;
  return {
    title: engagement ? `${engagement.title} — Engagement` : 'Engagement Not Found',
  };
}

// No `id === 'new'` branch — an engagement without a lead is meaningless;
// creation is the Start engagement action on a qualified lead.
export default async function AdminEngagementPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (!UUID_RE.test(id)) notFound();

  // The admin's read is where zombie runs are cleared: a tailoring request
  // that died mid-call (>5 min) and a brief whose after() never finished
  // (>7 min) flip to failed here, so the panels never show a stuck spinner.
  // Both are fenced on their 'generating' status; a live run is untouched.
  const admin = createAdminClient();
  await Promise.all([flipStaleTailoring(admin, id), flipStaleBriefs(admin, id)]);

  const [engagement, events, questionnaire, latestBrief] = await Promise.all([
    getEngagementById(id),
    getEngagementEvents(id),
    getEngagementQuestionnaire(id),
    getLatestEngagementBrief(id),
  ]);
  if (!engagement) notFound();

  // Live progress for the discovery panel (answers at the current manifest
  // version that are actually present — the engagement_answer_is_present rule).
  let answeredCount = 0;
  if (questionnaire && (questionnaire.status === 'sent' || questionnaire.status === 'in_progress')) {
    const { data: answerRows } = await admin
      .from('engagement_questionnaire_answers')
      .select('answer, other_text')
      .eq('questionnaire_id', questionnaire.id)
      .eq('questions_version', questionnaire.questions_version);
    answeredCount = ((answerRows ?? []) as { answer: string | string[]; other_text: string | null }[]).filter((a) =>
      isAnswerPresent(a.answer, a.other_text),
    ).length;
  }

  const meta = [
    engagement.client_contact_name || engagement.client_contact_email
      ? [engagement.client_contact_name, engagement.client_contact_email].filter(Boolean).join(' · ')
      : 'No client contact yet',
    engagement.locale === 'ja' ? 'Japanese' : 'English',
    engagement.tier ? TIER_LABELS[engagement.tier] ?? engagement.tier : null,
    `Started ${formatShortDate(engagement.created_at)}`,
  ].filter(Boolean);

  // The workspace is an explicit panel list. Order: stage control → client
  // contact → discovery panel → client answers (once a snapshot exists) →
  // discovery brief (once a snapshot OR a prior brief exists — briefs survive a
  // start over) → timeline. Generate is offered only while submitted: a
  // reopened questionnaire waits for the resubmit (see the brief route).
  const snapshot = questionnaire?.answer_snapshot ?? null;
  const panels = [
    <EngagementStageControl key="stage" engagement={engagement} />,
    <EngagementContactCard key="contact" engagement={engagement} />,
    <EngagementDiscoveryPanel key="discovery" engagement={engagement} questionnaire={questionnaire} answeredCount={answeredCount} />,
    ...(questionnaire && snapshot
      ? [<EngagementAnswersView key="answers" snapshot={snapshot} submittedAt={questionnaire.submitted_at} status={questionnaire.status} />]
      : []),
    ...(questionnaire && (snapshot || latestBrief)
      ? [
          <EngagementBriefPanel
            key="brief"
            engagementId={engagement.id}
            questionnaireSubmittedAt={questionnaire.submitted_at}
            canGenerate={!!snapshot && questionnaire.status === 'submitted'}
          />,
        ]
      : []),
    <EngagementTimeline key="timeline" engagementId={engagement.id} events={events} />,
  ];

  return (
    <div className="space-y-6 max-w-[880px]">
      <Link
        href="/admin/studio/engagements"
        className="inline-flex items-center gap-1.5 text-[13px] text-fg-tertiary hover:text-fg-secondary"
      >
        <ArrowLeft size={15} /> All engagements
      </Link>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-tertiary">
          Engagement · {STAGE_LABELS[engagement.stage]}
        </p>
        <h1 className="mt-1 text-[clamp(20px,2.4vw,26px)] font-bold text-fg-primary tracking-[-0.02em]">
          {engagement.title}
        </h1>
        <p className="mt-1.5 text-[13px] text-fg-tertiary">{meta.join(' · ')}</p>
        <Link
          href={`/admin/studio/leads/${engagement.lead_id}`}
          className="mt-2 inline-flex items-center min-h-[44px] text-[12px] font-semibold text-[color:var(--accent-teal)] hover:underline"
        >
          Lead workspace →
        </Link>
      </div>

      {panels}
    </div>
  );
}
