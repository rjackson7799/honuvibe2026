import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileDown } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export const metadata = {
  title: 'Partner Enrollments — Admin',
};

type EnrollmentRow = {
  id: string;
  enrolled_at: string;
  status: string;
  amount_paid: number | null;
  currency: string | null;
  users: { full_name: string | null; email: string | null } | null;
  courses: { slug: string; title_en: string } | null;
};

function formatMoney(amount: number | null, currency: string | null) {
  if (amount == null) return '—';
  if (currency === 'jpy') return `¥${amount.toLocaleString()}`;
  if (currency === 'usd') return `$${(amount / 100).toFixed(2)}`;
  return String(amount);
}

export default async function AdminPartnerEnrollmentsPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = createAdminClient();

  const { data: partner } = await supabase
    .from('partners')
    .select('id, slug, name_en, revenue_share_pct')
    .eq('id', id)
    .maybeSingle();

  if (!partner) notFound();

  const { data: rows } = await supabase
    .from('enrollments')
    .select(`
      id,
      enrolled_at,
      status,
      amount_paid,
      currency,
      users:user_id ( full_name, email ),
      courses:course_id ( slug, title_en )
    `)
    .eq('partner_id', id)
    .order('enrolled_at', { ascending: false });

  const enrollments = ((rows ?? []) as unknown as EnrollmentRow[]);
  const activeEnrollments = enrollments.filter((r) => r.status === 'active');

  const revenueByCurrency = activeEnrollments.reduce<Record<string, number>>((acc, r) => {
    if (!r.amount_paid || !r.currency) return acc;
    acc[r.currency] = (acc[r.currency] ?? 0) + r.amount_paid;
    return acc;
  }, {});

  const sharePct = Number(partner.revenue_share_pct ?? 0);

  return (
    <div className="max-w-[1100px] space-y-6">
      <Link
        href={`/admin/partners/${partner.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-tertiary hover:text-fg-primary"
      >
        <ArrowLeft size={14} />
        Back to partner
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl text-fg-primary">{partner.name_en} — Enrollments</h1>
          <p className="text-sm text-fg-tertiary font-mono mt-1">{partner.slug}</p>
        </div>
        <Link
          href={`/api/admin/partners/${partner.id}/enrollments/csv`}
          className="inline-flex items-center gap-1.5 text-sm text-accent-teal hover:underline"
        >
          <FileDown size={14} /> Download CSV
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Active enrollments" value={activeEnrollments.length.toString()} />
        <Stat
          label="Revenue (USD)"
          value={formatMoney(revenueByCurrency.usd ?? 0, 'usd')}
          hint={sharePct > 0 ? `Rev-share ${sharePct}% = ${formatMoney(Math.round((revenueByCurrency.usd ?? 0) * sharePct / 100), 'usd')}` : undefined}
        />
        <Stat
          label="Revenue (JPY)"
          value={formatMoney(revenueByCurrency.jpy ?? 0, 'jpy')}
          hint={sharePct > 0 ? `Rev-share ${sharePct}% = ${formatMoney(Math.round((revenueByCurrency.jpy ?? 0) * sharePct / 100), 'jpy')}` : undefined}
        />
      </div>

      {enrollments.length === 0 ? (
        <div className="rounded-lg border border-border-default bg-bg-secondary p-8 text-center text-fg-secondary">
          No enrollments attributed to this partner yet.
        </div>
      ) : (
        <div className="rounded-lg border border-border-default bg-bg-secondary overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default text-fg-tertiary">
                <th className="text-left py-3 px-4 font-medium">Enrolled</th>
                <th className="text-left py-3 px-4 font-medium">Student</th>
                <th className="text-left py-3 px-4 font-medium">Course</th>
                <th className="text-left py-3 px-4 font-medium">Amount</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border-default last:border-0 hover:bg-bg-tertiary"
                >
                  <td className="py-3 px-4 text-fg-secondary whitespace-nowrap">
                    {new Date(row.enrolled_at).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-fg-primary">{row.users?.full_name ?? '—'}</div>
                    <div className="text-xs text-fg-tertiary">{row.users?.email ?? ''}</div>
                  </td>
                  <td className="py-3 px-4 text-fg-secondary">{row.courses?.title_en ?? '—'}</td>
                  <td className="py-3 px-4 text-fg-secondary">
                    {formatMoney(row.amount_paid, row.currency)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        row.status === 'active'
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : 'bg-bg-tertiary text-fg-tertiary border-border-default'
                      }`}
                    >
                      {row.status}
                    </span>
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

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className="mt-1 font-serif text-2xl text-fg-primary">{value}</div>
      {hint && <div className="text-xs text-fg-tertiary mt-1">{hint}</div>}
    </div>
  );
}
