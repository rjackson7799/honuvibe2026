import Link from 'next/link';
import type { ProofArtifact } from '@/lib/proof/types';

const TYPE_STYLE: Record<string, string> = {
  testimonial: 'bg-accent-teal/10 text-accent-teal',
  case_study: 'bg-accent-gold/10 text-accent-gold',
  student_outcome: 'bg-bg-tertiary text-fg-secondary',
};

export function AdminProofList({ proof }: { proof: ProofArtifact[] }) {
  if (proof.length === 0) {
    return (
      <p className="text-fg-tertiary text-sm py-8 text-center border border-dashed border-border-default rounded-xl">
        No proof yet. Add your first testimonial or case study.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border-default overflow-hidden bg-bg-secondary">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-fg-tertiary text-[12px] uppercase tracking-[0.04em]">
            <th className="px-4 py-3 font-semibold">Person / Quote</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Org</th>
            <th className="px-4 py-3 font-semibold">Permissions</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {proof.map((p) => (
            <tr
              key={p.id}
              className="border-t border-border-default hover:bg-bg-tertiary transition-colors"
            >
              <td className="px-4 py-3 max-w-[360px]">
                <Link
                  href={`/admin/proof/${p.id}`}
                  className="text-fg-primary font-medium hover:text-accent-teal"
                >
                  {p.person_name || 'Anonymous'}
                </Link>
                <span className="block text-[12px] text-fg-tertiary truncate">
                  &ldquo;{p.quote_en}&rdquo;
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[12px] font-medium ${
                    TYPE_STYLE[p.artifact_type] ?? 'bg-bg-tertiary text-fg-tertiary'
                  }`}
                >
                  {p.artifact_type.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-fg-secondary">{p.org || '—'}</td>
              <td className="px-4 py-3 text-fg-secondary whitespace-nowrap text-[12px]">
                {[
                  p.quote_permission ? 'quote' : null,
                  p.name_public ? 'name' : null,
                  p.logo_permission ? 'logo' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </td>
              <td className="px-4 py-3 text-fg-secondary">
                {p.is_published ? 'Published' : 'Draft'}
                {p.is_featured ? ' · Featured' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
