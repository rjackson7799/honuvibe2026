import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getEngagementById, getEngagementEvents } from '@/lib/admin/queries';
import { STAGE_LABELS } from '@/lib/studio/engagement/stages';
import { formatShortDate } from '@/lib/studio/engagement/format';
import { EngagementStageControl } from '@/components/admin/EngagementStageControl';
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

  const [engagement, events] = await Promise.all([getEngagementById(id), getEngagementEvents(id)]);
  if (!engagement) notFound();

  const meta = [
    engagement.client_contact_name || engagement.client_contact_email
      ? [engagement.client_contact_name, engagement.client_contact_email].filter(Boolean).join(' · ')
      : 'No client contact yet',
    engagement.locale === 'ja' ? 'Japanese' : 'English',
    engagement.tier ? TIER_LABELS[engagement.tier] ?? engagement.tier : null,
    `Started ${formatShortDate(engagement.created_at)}`,
  ].filter(Boolean);

  // The workspace is an explicit panel list so the next slice slots in
  // without reshuffling. Order: stage control → (slice 2: discovery panel,
  // answers view, brief panel go HERE, between the stage control and the
  // timeline) → timeline.
  const panels = [
    <EngagementStageControl key="stage" engagement={engagement} />,
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
