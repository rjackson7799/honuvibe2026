import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { getProposalsForAdmin } from '@/lib/instructor-portal/queries';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Course proposals — Admin',
};

const statusStyles: Record<string, string> = {
  proposal: 'bg-accent-gold/15 text-accent-gold border-accent-gold/30',
  rejected: 'bg-red-500/15 text-red-500 border-red-500/30',
};

export default async function AdminProposalsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const proposals = await getProposalsForAdmin();

  // Resolve proposer display names (best-effort — RLS already lets admin read)
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
        <h1 className="text-2xl font-serif text-fg-primary">Course proposals</h1>
        <p className="text-sm text-fg-tertiary mt-1">
          Instructor-authored pitches awaiting review. Approving moves the course into{' '}
          <span className="font-medium text-fg-secondary">draft</span> for you to finish authoring.
        </p>
      </div>

      <div className="flex gap-2 text-xs uppercase tracking-wider text-fg-tertiary">
        <span className="px-2 py-1 rounded bg-accent-gold/10 text-accent-gold">
          Pending: {pendingCount}
        </span>
        <span className="px-2 py-1 rounded bg-red-500/10 text-red-400">
          Rejected: {rejectedCount}
        </span>
      </div>

      {proposals.length === 0 ? (
        <p className="text-fg-tertiary text-center py-12 border border-dashed border-border-default rounded-lg">
          No proposals to review right now.
        </p>
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
                className="block border border-border-default rounded-lg p-4 hover:border-accent-teal/40 hover:bg-bg-tertiary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-fg-primary">{p.title_en}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-medium ${
                          statusStyles[p.status] ?? ''
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-fg-tertiary truncate">
                      {proposerName ? `by ${proposerName}` : 'unknown proposer'}
                      {p.proposal_submitted_at &&
                        ` · submitted ${new Date(p.proposal_submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </p>
                    {p.description_en && (
                      <p className="mt-1 text-xs text-fg-tertiary line-clamp-2">
                        {p.description_en}
                      </p>
                    )}
                  </div>
                  <span className="text-fg-tertiary text-sm shrink-0">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
