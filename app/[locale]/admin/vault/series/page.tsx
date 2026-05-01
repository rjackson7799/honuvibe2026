import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { getVaultAdminSeriesList } from '@/lib/vault/queries';
import { BadgePill } from '@/components/ui/badge-pill';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Vault Series — Admin',
};

export default async function AdminVaultSeriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const series = await getVaultAdminSeriesList();

  return (
    <div className="space-y-6 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
            Vault Series
          </h1>
          <p className="text-sm text-fg-tertiary mt-1.5">{series.length} series</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/vault"
            className="inline-flex items-center h-10 px-3.5 rounded-[10px] bg-bg-secondary border border-border-default text-fg-secondary text-[13px] font-semibold hover:border-border-hover hover:text-fg-primary transition-colors"
          >
            Content
          </Link>
          <Link
            href="/admin/vault/series/new"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold shadow-sm hover:shadow-md transition-all"
          >
            <PlusCircle size={16} />
            Add Series
          </Link>
        </div>
      </div>

      {/* Table */}
      {series.length === 0 ? (
        <div className="py-10 px-4 rounded-[14px] border border-dashed border-border-default bg-bg-tertiary text-center">
          <p className="text-sm text-fg-tertiary">No series yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-bg-secondary border border-border-default rounded-[14px] shadow-[var(--shadow-md)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default bg-bg-tertiary text-left">
                <th className="px-4 py-3 text-[11.5px] font-bold uppercase tracking-[0.06em] text-fg-tertiary">Title</th>
                <th className="px-4 py-3 text-[11.5px] font-bold uppercase tracking-[0.06em] text-fg-tertiary text-center">Items</th>
                <th className="px-4 py-3 text-[11.5px] font-bold uppercase tracking-[0.06em] text-fg-tertiary text-center">Duration</th>
                <th className="px-4 py-3 text-[11.5px] font-bold uppercase tracking-[0.06em] text-fg-tertiary">Difficulty</th>
                <th className="px-4 py-3 text-[11.5px] font-bold uppercase tracking-[0.06em] text-fg-tertiary text-center">Status</th>
                <th className="px-4 py-3 text-[11.5px] font-bold uppercase tracking-[0.06em] text-fg-tertiary text-right">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-secondary">
              {series.map((s) => (
                <tr key={s.id} className="hover:bg-bg-tertiary transition-colors">
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/admin/vault/series/${s.id}`}
                      className="text-[13.5px] text-fg-primary hover:text-[color:var(--accent-teal)] transition-colors font-semibold"
                    >
                      {s.title_en}
                    </Link>
                    {s.title_jp && (
                      <p className="text-[11.5px] text-fg-tertiary mt-0.5">{s.title_jp}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center text-fg-secondary">{s.item_count}</td>
                  <td className="px-4 py-3.5 text-center text-fg-secondary">
                    {s.total_duration_minutes > 0 ? `${s.total_duration_minutes} min` : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-fg-secondary capitalize">
                    {s.difficulty_level ?? '—'}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {s.is_published ? (
                      <BadgePill variant="teal" size="xs">Published</BadgePill>
                    ) : (
                      <BadgePill variant="gray" size="xs">Draft</BadgePill>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right text-[11.5px] text-fg-tertiary font-medium">
                    {new Date(s.updated_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
