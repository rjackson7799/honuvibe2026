import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getProposalsForAdmin } from '@/lib/instructor-portal/queries';
import { createClient } from '@/lib/supabase/server';
import { BadgePill } from '@/components/ui/badge-pill';
import { StatusBadge } from '@/components/admin/StatusBadge';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Course proposals — Admin',
};

export default async function AdminProposalsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const proposals = await getProposalsForAdmin();

  const supabase = await createClient();
  const proposerIds = Array.from(
    new Set(
      proposals
        .map((p) => (p as unknown as { proposed_by_instructor_id: string | null }).proposed_by_instructor_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const nameById = new Map<string, string>();
  if (proposerIds.length > 0) {
    const { data: instructorRows } = await supabase
      .from('instructor_profiles')
      .select('id, display_name')
      .in('id', proposerIds);
    for (const row of instructorRows ?? []) nameById.set(row.id, row.display_name);
  }

  const pendingCount = proposals.filter((p) => p.status === 'proposal').length;
  const rejectedCount = proposals.filter((p) => p.status === 'rejected').length;

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div>
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          Course Proposals
        </h1>
        <p className="text-sm text-fg-tertiary mt-1.5">
          Instructor-authored pitches awaiting review. Approving moves the course into{' '}
          <span className="font-semibold text-fg-secondary">draft</span> for you to finish authoring.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <BadgePill variant="coral" size="sm">Pending: {pendingCount}</BadgePill>
        <BadgePill variant="gray" size="sm">Rejected: {rejectedCount}</BadgePill>
      </div>

      {proposals.length === 0 ? (
        <div className="py-10 px-4 rounded-[14px] border border-dashed border-border-default bg-bg-tertiary text-center">
          <p className="text-sm text-fg-tertiary">No proposals to review right now.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {proposals.map((p) => {
            const proposerId = (p as unknown as { proposed_by_instructor_id: string | null })
              .proposed_by_instructor_id;
            const proposerName = proposerId ? nameById.get(proposerId) : null;
            return (
              <Link
                key={p.id}
                href={`/admin/courses/${p.id}`}
                className="group block bg-bg-secondary border border-border-default rounded-[14px] p-4 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:border-[color:var(--accent-teal)]/35 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[14px] font-semibold text-fg-primary">{p.title_en}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-[12px] text-fg-tertiary truncate">
                      {proposerName ? `by ${proposerName}` : 'unknown proposer'}
                      {p.proposal_submitted_at &&
                        ` · submitted ${new Date(p.proposal_submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </p>
                    {p.description_en && (
                      <p className="mt-1 text-[12.5px] text-fg-tertiary line-clamp-2">
                        {p.description_en}
                      </p>
                    )}
                  </div>
                  <ArrowRight
                    size={18}
                    className="text-fg-tertiary group-hover:text-[color:var(--accent-teal)] shrink-0 mt-1 transition-colors"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
