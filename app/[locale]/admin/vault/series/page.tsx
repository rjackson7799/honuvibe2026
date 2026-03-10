import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { getVaultAdminSeriesList } from '@/lib/vault/queries';

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-fg-primary">Vault Series</h1>
          <p className="text-sm text-fg-tertiary mt-1">{series.length} series</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/vault"
            className="text-sm text-fg-tertiary hover:text-fg-primary transition-colors"
          >
            Content
          </Link>
          <Link
            href="/admin/vault/series/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-teal text-white text-sm font-medium hover:bg-accent-teal/90 transition-colors"
          >
            <PlusCircle size={16} />
            Add Series
          </Link>
        </div>
      </div>

      {/* Table */}
      {series.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-fg-tertiary">No series yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default text-left">
                <th className="pb-2 font-medium text-fg-tertiary">Title</th>
                <th className="pb-2 font-medium text-fg-tertiary text-center">Items</th>
                <th className="pb-2 font-medium text-fg-tertiary text-center">Duration</th>
                <th className="pb-2 font-medium text-fg-tertiary">Difficulty</th>
                <th className="pb-2 font-medium text-fg-tertiary text-center">Status</th>
                <th className="pb-2 font-medium text-fg-tertiary text-right">Updated</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.id} className="border-b border-border-default/50 hover:bg-bg-tertiary/50 transition-colors">
                  <td className="py-3">
                    <Link
                      href={`/admin/vault/series/${s.id}`}
                      className="text-fg-primary hover:text-accent-teal transition-colors font-medium"
                    >
                      {s.title_en}
                    </Link>
                    {s.title_jp && (
                      <p className="text-xs text-fg-tertiary mt-0.5">{s.title_jp}</p>
                    )}
                  </td>
                  <td className="py-3 text-center text-fg-secondary">{s.item_count}</td>
                  <td className="py-3 text-center text-fg-secondary">
                    {s.total_duration_minutes > 0 ? `${s.total_duration_minutes} min` : '—'}
                  </td>
                  <td className="py-3 text-fg-secondary capitalize">
                    {s.difficulty_level ?? '—'}
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        s.is_published
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-bg-tertiary text-fg-tertiary'
                      }`}
                    >
                      {s.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="py-3 text-right text-xs text-fg-tertiary">
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
