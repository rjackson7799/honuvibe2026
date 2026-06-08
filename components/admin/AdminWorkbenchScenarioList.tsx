import Link from 'next/link';
import type { AdminWorkbenchScenarioListItem } from '@/lib/workbench/queries';

const DOMAIN_STYLE: Record<string, string> = {
  marketing: 'bg-accent-teal/10 text-accent-teal',
  operations: 'bg-accent-gold/10 text-accent-gold',
  communication: 'bg-bg-tertiary text-fg-secondary',
};

export function AdminWorkbenchScenarioList({
  scenarios,
}: {
  scenarios: AdminWorkbenchScenarioListItem[];
}) {
  if (scenarios.length === 0) {
    return (
      <p className="text-fg-tertiary text-sm py-8 text-center border border-dashed border-border-default rounded-xl">
        No scenarios yet. Create your first one.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border-default overflow-hidden bg-bg-secondary">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-fg-tertiary text-[12px] uppercase tracking-[0.04em]">
            <th className="px-4 py-3 font-semibold">Scenario</th>
            <th className="px-4 py-3 font-semibold">Domain</th>
            <th className="px-4 py-3 font-semibold">Difficulty</th>
            <th className="px-4 py-3 font-semibold">Dimensions</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Attempts</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s) => (
            <tr
              key={s.id}
              className="border-t border-border-default hover:bg-bg-tertiary transition-colors"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/admin/workbench/${s.id}`}
                  className="text-fg-primary font-medium hover:text-accent-teal"
                >
                  {s.title_en || 'Untitled scenario'}
                </Link>
                <span className="block text-[12px] text-fg-tertiary font-mono">{s.slug}</span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[12px] font-medium ${
                    DOMAIN_STYLE[s.domain] ?? 'bg-bg-tertiary text-fg-tertiary'
                  }`}
                >
                  {s.domain}
                </span>
              </td>
              <td className="px-4 py-3 text-fg-secondary capitalize">{s.difficulty}</td>
              <td className="px-4 py-3 text-fg-secondary whitespace-nowrap">
                {s.applicable_dimensions.length}
              </td>
              <td className="px-4 py-3 text-fg-secondary">
                {s.is_published ? 'Published' : 'Draft'}
                {s.is_featured ? ' · Featured' : ''}
              </td>
              <td className="px-4 py-3 text-fg-secondary whitespace-nowrap">{s.attempt_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
